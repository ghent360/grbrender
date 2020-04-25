import { 
    GerberPolygons,
    Bounds,
    GerberParserOutput,
    ExcellonHoles,
    ComponentCenters,
    FileContent
} from "./AsyncGerberParserAPI";
import {
     BoardLayer,
     BoardSide
} from "grbparser/dist/gerberutils";
import * as Color from 'color';
import {
    Canvas
} from "canvas";


export interface LayerInfo {
    readonly fileName:string;
    readonly boardLayer:BoardLayer,
    readonly boardSide:BoardSide,
    readonly status:string;
    readonly polygons:GerberPolygons,
    readonly holes:ExcellonHoles,
    readonly centers:ComponentCenters;
    readonly content:string,
    readonly selected:boolean;
    readonly opacity:number;
    readonly solid:Path2D;
    readonly thin:Path2D;
    readonly color:Color;
}

// Oshpark mask #2b1444
//
// FR4 #ab9f15
export const colorFR4 = '#ab9f15';
export const colorENIG = '#d8bf8a';
export const colorHASL = '#cad4c9';
export const colorGreen = '#0e8044';

const layerColors = {
    0:"#e9b397",    // Copper
    1:colorENIG,    // SolderMask
    2:"white",      // Silk // #c2d3df
    3:"silver",     // Paste
    4:"white",      // Drill
    5:"black",      // Mill
    6:"black",      // Outline
    7:"carbon",     // Carbon
    8:"green",      // Notes
    9:"yellow",     // Assembly
    10:"brown",     // Mechanical
    11:"black",     // Unknown
};

class LayerFile implements LayerInfo {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content:string,
        public polygons:GerberPolygons,
        public holes:ExcellonHoles,
        public centers:ComponentCenters,
        public selected:boolean,
        public opacity:number,
        public solid:Path2D,
        public thin:Path2D,
        public color:Color) {}
}

function drawPolygon(polygon:Float64Array, context:Path2D) {
    context.moveTo(polygon[0], polygon[1]);
    for (let idx = 2; idx < polygon.length; idx += 2) {
        context.lineTo(polygon[idx], polygon[idx + 1]);
    }
}

function createPathCache(polygons:GerberPolygons):{solid:Path2D, thin:Path2D} {
    let solidPath = new Path2D();
    let isEmpty = true;
    polygons.solids
        .filter(p => p.length > 1)
        .forEach(p => {
            drawPolygon(p, solidPath);
            isEmpty = false;
        });
    if (!isEmpty) {
        solidPath.closePath();
    } else {
        solidPath = undefined;
    }
    let thinPath = new Path2D();
    isEmpty = true;
    polygons.thins
        .filter(p => p.length > 1)
        .forEach(p => {
            drawPolygon(p, thinPath);
            isEmpty = false;
        });
    if (isEmpty) {
        thinPath = undefined;
    }
    return {solid:solidPath, thin:thinPath};
}

function calcBounds(selection:Array<LayerInfo>):Bounds {
    if (selection.length == 0) {
        return undefined;
    }
    let result = {
        minx:Number.MAX_SAFE_INTEGER,
        miny:Number.MAX_SAFE_INTEGER,
        maxx:Number.MIN_SAFE_INTEGER,
        maxy:Number.MIN_SAFE_INTEGER,
    };
    selection.forEach(o => {
        let bounds:Bounds;
        if (o.polygons) {
            bounds = o.polygons.bounds;
        } else if (o.holes) {
            bounds = o.holes.bounds;
        } else if (o.centers) {
            bounds = o.centers.bounds;
        }
        if (bounds.minx < result.minx) {
            result.minx = bounds.minx;
        }
        if (bounds.miny < result.miny) {
            result.miny = bounds.miny;
        }
        if (bounds.maxx > result.maxx) {
            result.maxx = bounds.maxx;
        }
        if (bounds.maxy > result.maxy) {
            result.maxy = bounds.maxy;
        }
    });
    return result;
}

export interface CanvasViewerProps { 
    layers:Array<LayerInfo>;
    bounds:Bounds;
}

interface ContentSize {
    contentWidth:number;
    contentHeight:number;
    contentMinX:number;
    contentMinY:number;
}

function toString2(n:number):string {
    return ((n >>> 4) & 0xf).toString(16) +
        (n & 0xf).toString(16);
}

function colorToHtml(clr:number):string {
    let ss:string;
    ss = '#' + toString2((clr >>> 16) & 0xff)
        + toString2((clr >>> 8) & 0xff)
        + toString2(clr & 0xff);
    return ss;
}

export class CanvasViewer {
    private width:number;
    private height:number;
    private selection:Array<LayerInfo>;
    private contentSize:ContentSize;

    public scale:number = 1;
    public offsetX:number = 0;
    public offsetY:number = 0;
    public hFlip:boolean = false;
    public vFlip:boolean = true;
    public layerColor:number = 0xa02010;
    public useCheckeredBackground:boolean = false;
    public blockSize:number = 10;

    setLayers(props:CanvasViewerProps):void {
        this.contentSize = this.computeContentSize(props);
        this.selection = props.layers ? props.layers.filter(l => l.selected) : undefined;
    }

    private computeContentSize(props:CanvasViewerProps):ContentSize {
        let bounds = props.bounds;
        return { 
            contentWidth:bounds.maxx - bounds.minx,
            contentHeight:bounds.maxy - bounds.miny,
            contentMinX:bounds.minx,
            contentMinY:bounds.miny,
        };
    }

    private getSolidColor(layer:LayerInfo):string {
        if (this.selection.length == 1) {
            return colorToHtml(this.layerColor);
        }
        return layer.color.hex();
    }

    private getBorderColor(layer:LayerInfo):string {
        if (this.selection.length == 1) {
            return colorToHtml(this.layerColor);
        }
        return layer.color.hex();
    }

    private clearCanvas(context:CanvasRenderingContext2D) {
        context.clearRect(0, 0, this.width, this.height);
        if (this.useCheckeredBackground) {
            let blockSize = this.blockSize;
            let numBlocksX = Math.round(this.width / blockSize);
            let numBlocksY = Math.round(this.height / blockSize);
            context.fillStyle = '#d0d0d0';
            for (let x = 0; x < numBlocksX; x++) {
                for (let y = 0; y < numBlocksY; y++) {
                    if ((x + y) % 2) {
                        context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
                    }
                }
            }
        }
    }

    private drawOutline(context:CanvasRenderingContext2D) {
        let outline:Array<Path2D> = this.calcBoardOutline();
        context.fillStyle = colorFR4;
        outline.forEach(p => context.fill(p));
    }

    private calcBoardOutline():Array<Path2D> {
        let selection = this.selection;
        let outlineLayers = selection.filter(l => l.boardLayer == BoardLayer.Outline);
        let filledOutline = false;
        let outline:Array<Path2D> = [];
        if (outlineLayers.length > 0) {
            outlineLayers.forEach(o => {
                let path:Path2D = o.thin;
                if (path == undefined) {
                    // Hmm what to do if there is no thin polygon path
                    // filling the solid path, just draws the cutout shape.
                    //path = this.state.polygonPaths.get(o.fileName + ":solid");
                }
                if (path != undefined) {
                    outline.push(path);
                    filledOutline = true;
                }
            });
        }
        if (!filledOutline) {
            // We could not find anything to fill as outline, just draw min/max rectangle
            let rect = new Path2D();
            rect.rect(
                this.contentSize.contentMinX,
                this.contentSize.contentMinY,
                this.contentSize.contentWidth,
                this.contentSize.contentHeight);
            outline.push(rect);
        }
        return outline;
    }

    private drawSelection(context:CanvasRenderingContext2D) {
        let selection = this.selection;
        let width = this.width;
        let height = this.height;
        let outline:Array<Path2D>;
        if (selection.length > 1) {
            selection.sort((a, b) => a.boardLayer - b.boardLayer);
            outline = this.calcBoardOutline();
        }
        if (selection && width > 0 && height > 0) {
            let scaleX = width / this.contentSize.contentWidth;
            let scaleY = height / this.contentSize.contentHeight;
            let scale = Math.min(scaleX, scaleY);
            let originX = (width - this.contentSize.contentWidth * scale) / 2;
            let originY = (height - this.contentSize.contentHeight * scale) / 2;
            // Flip the Y axis
            let xtranslate:number;
            let ytranslate:number;
            let xscale:number;
            let yscale:number;

            if (this.hFlip) {
                xtranslate = this.width - originX;
                xscale = -scale;
            } else {
                xtranslate = originX;
                xscale = scale;
            }
            if (this.vFlip) {
                ytranslate = this.height - originY;
                yscale = -scale;
            } else {
                ytranslate = originY;
                yscale = scale;
            }
            context.translate(xtranslate, ytranslate);
            context.scale(xscale, yscale);
            context.translate(
                -this.contentSize.contentMinX,
                -this.contentSize.contentMinY);
            if (selection.length > 1) {
                context.lineWidth = 0;
                context.fillStyle = colorFR4;
                outline.forEach(p => context.fill(p));
            }
            selection.forEach(l => {
                let path = l.solid;
                if (path != undefined) {
                    context.lineWidth = 0;
                    context.globalAlpha = l.opacity;
                    if (l.boardLayer == BoardLayer.SolderMask && outline != undefined) {
                        context.fillStyle = 'rgba(32, 2, 94, 0.7)'; // target color #2b1444
                        outline.forEach(p => context.fill(p));
                    }
                    context.fillStyle = this.getSolidColor(l);
                    context.fill(path);
                }
                path = l.thin;
                if (path != undefined) {
                    // Set line width to 1 pixel. The width is scaled with the transform, so
                    // 1/scale ends up being 1px.
                    context.lineWidth = 1/scale;
                    context.globalAlpha = l.opacity;
                    context.strokeStyle = this.getBorderColor(l);
                    context.stroke(path);
                }
                if (l.holes != undefined) {
                    context.lineWidth = 0;
                    context.globalAlpha = l.opacity;
                    context.fillStyle = this.getSolidColor(l);
                    l.holes.holes.forEach(hole => {
                        context.beginPath();
                        context.arc(hole.x, hole.y, hole.drillSize / 2, 0, Math.PI * 2);
                        context.fill();
                    });
                }
                if (l.centers != undefined) {
                    context.lineWidth = 1/scale;
                    context.globalAlpha = l.opacity;
                    context.strokeStyle = this.getBorderColor(l);
                    const size = 10 / scale;
                    l.centers.centers.forEach(cmp => {
                        context.beginPath();
                        context.moveTo(cmp.center.x - size/2, cmp.center.y);
                        context.lineTo(cmp.center.x + size/2, cmp.center.y);
                        context.moveTo(cmp.center.x, cmp.center.y - size/2);
                        context.lineTo(cmp.center.x, cmp.center.y + size/2);
                        context.stroke();
                    });
                }
            });
        }
    }

    draw(canvas:Canvas) {
        this.width = canvas.width;
        this.height = canvas.height;
        const context = canvas.getContext('2d');
        this.clearCanvas(context);
        context.save();
        context.translate(this.offsetX, this.offsetY);
        context.scale(this.scale, this.scale);
        this.drawSelection(context);
        context.restore();
    }
}