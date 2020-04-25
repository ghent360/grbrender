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
import {
    AsyncGerberParser
} from "./AsyncGerberParser";
import {
    LayerInfo
} from "./CanvasRenderer";
import * as Color from 'color';
import * as fs from 'fs';
require('canvas-5-polyfill');

const colorENIG = '#d8bf8a';
const colorHASL = '#cad4c9';
const colorGreen = '#0e8044';

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

function getBoardLayer(layer:BoardLayer):string {
    switch(layer) {
        case BoardLayer.Copper: return "copper";
        case BoardLayer.SolderMask: return "solder mask";
        case BoardLayer.Silk: return "silk screen";
        case BoardLayer.Paste: return "paste";
        case BoardLayer.Drill: return "drill";
        case BoardLayer.Mill: return "mill";
        case BoardLayer.Outline: return "outline";
        case BoardLayer.Carbon: return "carbon";
        case BoardLayer.Notes: return "notes";
        case BoardLayer.Assembly: return "assembly";
        case BoardLayer.Mechanical: return "mechanical";
        case BoardLayer.Place: return "pick-n-place";
    }
    return "unknown";
}

function getBoardSide(side:BoardSide):string {
    switch(side) {
        case BoardSide.Top: return "top";
        case BoardSide.Both: return "both";
        case BoardSide.Bottom: return "bottom";
        case BoardSide.Internal: return "internal";
    }
    return "unknown";
}

export class GerberRenderer {
    private layerList:Array<LayerFile>;

    readZipFile(file:string):void {
        /* old code        
            let reader = new FileReader();
            reader.onload = (e:ProgressEvent) => {
                this.processZipFile(reader.result as ArrayBuffer);
            };
            reader.onerror = (e:any) => {
                console.log("Error: " + e.error);
            }
            reader.readAsArrayBuffer(file);
        */            
        fs.promises.readFile(file as string).then(data => {
            this.processZipFile(data.buffer);
        });
    }

    /*
    readFiles(files:Array<File>) {
        let reader = new FileReaderList(files);
        reader.read((content:Array<FileContent>) => this.processFiles(content));
    }
    */

   private processFiles(content:Array<FileContent>) {
        this.layerList = [];

        new AsyncGerberParser(
            {files:content},
            (status) => this.processGerberOutput(status),
            () => this.processingComplete());
    }

    private processZipFile(stream:ArrayBuffer):void {
        this.layerList = [];

        new AsyncGerberParser(
            {zipFileBuffer:stream},
            (status) => this.processGerberOutput(status),
            () => this.processingComplete());
    }

    private processGerberOutput(output:GerberParserOutput) {
        let newFileList = [];
        let handled = false
        for (let gerberFile of this.layerList) {
            if (gerberFile.fileName === output.fileName) {
                let cache = 
                    gerberFile.solid == undefined
                    && gerberFile.thin == undefined
                    && output.gerber ? createPathCache(output.gerber) : undefined;
                let layer = output.layer ? output.layer : gerberFile.boardLayer;
                let newGerberFile = new LayerFile(
                    output.fileName,
                    output.side ? output.side : gerberFile.boardSide,
                    layer,
                    output.status,
                    output.content ? output.content : gerberFile.content,
                    output.gerber,
                    output.holes,
                    output.centers,
                    false,
                    1,
                    cache ? cache.solid : gerberFile.solid,
                    cache ? cache.thin : gerberFile.thin,
                    Color(layerColors[layer]));
                newFileList.push(newGerberFile);
                handled = true;
            } else {
                newFileList.push(gerberFile);
            }
        }
        if (!handled) {
            let cache = output.gerber ? createPathCache(output.gerber) : undefined;
            let newGerberFile = new LayerFile(
                output.fileName,
                output.side,
                output.layer,
                output.status,
                output.content,
                output.gerber,
                output.holes,
                output.centers,
                false,
                1,
                cache ? cache.solid : undefined,
                cache ? cache.thin : undefined,
                Color(layerColors[output.layer]));
            newFileList.push(newGerberFile);
        }
        if (output.status === 'error') {
            console.log(`Reporting error ${output.exception}`);
        }
        this.layerList = newFileList;
    }

    private processingComplete():void {
        console.log(`Completed parsing ${this.layerList.length} layers.`);
        this.layerList.forEach((layer) => {
            console.log(`${layer.fileName} is ${getBoardLayer(layer.boardLayer)} layer on ${getBoardSide(layer.boardSide)} side`);
        });
    }
}