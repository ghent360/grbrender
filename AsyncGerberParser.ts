import {
    GerberToPolygons,
    Init,
    PolygonConverterResult
} from "grbparser/dist/converters";
import {
    BoardLayer,
    BoardSide,
    GerberUtils,
    BoardFileType
} from "grbparser/dist/gerberutils";
import {
    ExcellonParser
} from "grbparser/dist/excellonparser";
import {
    KicadCentroidParser
} from "grbparser/dist/kicadcentroidparser";
import * as JSZip from "jszip";
import {
    GerberParserOutput,
    ExcellonHoles,
    ComponentCenters,
    GerberParserInput
} from "./AsyncGerberParserAPI";


const ctx: Worker = self as any;

interface ProcessingData {
    gerber?:PolygonConverterResult;
    holes?:ExcellonHoles;
    centers?:ComponentCenters;
    content?:string;
    side?:BoardSide;
    layer?:BoardLayer;
    exception?:string;
    unzipTime?:number;
    renderTime?:number;
}

export class AsyncGerberParser {

    constructor(
        private inputData_:GerberParserInput,
        private statusUpdate_:(status:GerberParserOutput) => void,
        private complete_:() => void) {
        this.processInput();
    }

    private gerberToPolygons(fileName:string, content:string, unzipDuration:number) {
        Init.then(() => {
            try {
                let renderStart = performance.now();
                let polygons = GerberToPolygons(content);
                let renderEnd = performance.now();
                let status = 'done';
                if ((polygons.solids.length == 0 
                     && polygons.thins.length == 0)
                    || polygons.bounds == undefined) {
                    status = 'empty';
                }
                this.postStatusUpdate(fileName, status, {
                    gerber:polygons,
                    holes:undefined,
                    unzipTime:unzipDuration,
                    renderTime:renderEnd - renderStart });
            } catch (e) {
                console.log(`Exception processing ${fileName}: ${e}`);
                this.postStatusUpdate(fileName, "error", {
                    exception:e.toString(),
                    unzipTime:unzipDuration
                });
            }
        });
    }

    private excellonFile(fileName:string, content:string, unzipDuration:number) {
        try {
            //console.log(`Parsing '${fileName}'`);
            let renderStart = performance.now();
            let parser = new ExcellonParser();
            parser.parseBlock(content);
            parser.flush();
            let renderEnd = performance.now();
            let status = 'done';
            let holes = parser.result();
            if (holes.holes.length == 0) {
               status = 'empty';
            }
            this.postStatusUpdate(fileName, status, {
               gerber:undefined,
               holes:holes,
               unzipTime:unzipDuration,
               renderTime:renderEnd - renderStart });
        } catch (e) {
            console.log(`Exception processing ${fileName}: ${e}`);
            this.postStatusUpdate(fileName, "error", {
                exception:e.toString(),
                unzipTime:unzipDuration
            });
        }
    }

    private centroidFile(fileName:string, content:string, unzipDuration:number) {
        try {
            //console.log(`Parsing '${fileName}'`);
            let renderStart = performance.now();
            let parser = new KicadCentroidParser();
            parser.parseBlock(content);
            parser.flush();
            let renderEnd = performance.now();
            let status = 'done';
            let centers = parser.result();
            if (centers.components.length == 0) {
               status = 'empty';
            }
            this.postStatusUpdate(fileName, status, {
               side:centers.side,
               gerber:undefined,
               centers:{centers:centers.components,bounds:centers.bounds},
               unzipTime:unzipDuration,
               renderTime:renderEnd - renderStart });
        } catch (e) {
            console.log(`Exception processing ${fileName}: ${e}`);
            this.postStatusUpdate(fileName, "error", {
                exception:e.toString(),
                unzipTime:unzipDuration
            });
        }
    }

    private processZipFiles(zip:JSZip) {
        let allUnzips:Array<Promise<void>> = [];
        for(let fileName in zip.files) {
            let zipObject = zip.files[fileName];
            if (zipObject.dir) {
                continue;
            }
            if (fileName.endsWith('.DS_Store')) {
                continue;
            }
            if (fileName.indexOf('__MACOSX') >= 0) {
                continue;
            }
            fileName = GerberUtils.getFileName(fileName);
            let fileExt = GerberUtils.getFileExt(fileName.toLowerCase());
            if (GerberUtils.bannedExtensions.indexOf(fileExt) >= 0) {
                console.log(`Ignoring known extension ${fileName}`);
                continue;
            }
            let fileInfo = GerberUtils.determineSideAndLayer(fileName);
            this.postStatusUpdate(
                fileName, "Processing", {side:fileInfo.side, layer:fileInfo.layer});
            let startUnzip = performance.now();
            let unzipComplete = zipObject
                .async("text")
                .then( (content) => {
                    let endUnzip = performance.now();
                    this.postStatusUpdate(fileName, "Rendering", {content:content});
                    let fileType = GerberUtils.boardFileType(content);
                    if ((fileInfo.layer == BoardLayer.Drill 
                        && fileType == BoardFileType.Unsupported)
                        || fileType == BoardFileType.Drill) {
                        fileInfo.layer = BoardLayer.Drill;
                        fileInfo.side = BoardSide.Both;
                        this.postStatusUpdate(
                            fileName, "Rendering", {side:fileInfo.side, layer:fileInfo.layer});
                        this.excellonFile(fileName, content, endUnzip - startUnzip);
                    } else if (fileType == BoardFileType.Centroid) {
                        this.centroidFile(fileName, content, endUnzip - startUnzip);
                    } else {
                        this.gerberToPolygons(fileName, content, endUnzip - startUnzip);
                    }
                });
            allUnzips.push(unzipComplete);
        }
        Promise.all(allUnzips).then(() => {
            if (this.complete_) {
                this.complete_();
            }
        });
    }

    private processInput():void {
        if (this.inputData_.zipFileBuffer) {
            new JSZip()
                .loadAsync(this.inputData_.zipFileBuffer)
                .then(zip => this.processZipFiles(zip));
        } else if (this.inputData_.files) {
            this.inputData_.files.forEach(file => {
                let fileName = file.fileName;
                if (fileName.endsWith('.DS_Store')) {
                    return;
                }
                if (fileName.indexOf('__MACOSX') >= 0) {
                    return;
                }
                fileName = GerberUtils.getFileName(fileName);
                let fileExt = GerberUtils.getFileExt(fileName.toLowerCase());
                if (GerberUtils.bannedExtensions.indexOf(fileExt) >= 0) {
                    console.log(`Ignoring known extension ${fileName}`);
                    return;
                }
                let fileInfo = GerberUtils.determineSideAndLayer(fileName);
                this.postStatusUpdate(
                    fileName, "Processing", {side:fileInfo.side, layer:fileInfo.layer});
                this.postStatusUpdate(fileName, "Rendering", {content:file.content});
                let fileType = GerberUtils.boardFileType(file.content);
                if ((fileInfo.layer == BoardLayer.Drill 
                    && fileType == BoardFileType.Unsupported)
                    || fileType == BoardFileType.Drill) {
                    fileInfo.layer = BoardLayer.Drill;
                    fileInfo.side = BoardSide.Both;
                    this.postStatusUpdate(
                        fileName, "Rendering", {side:fileInfo.side, layer:fileInfo.layer});
                    this.excellonFile(fileName, file.content, -1);
                } else if (fileType == BoardFileType.Centroid) {
                    this.centroidFile(fileName, file.content, -1);
                } else {
                    this.gerberToPolygons(fileName, file.content, -1);
                }
            });
            if (this.complete_) {
                this.complete_();
            }
        }
    }

    private postStatusUpdate(fileName:string, status:string, data:ProcessingData) {
        let output = new GerberParserOutput(
            fileName,
            status,
            data.side,
            data.layer,
            data.content,
            data.gerber,
            data.holes,
            data.centers,
            data.exception,
            data.unzipTime,
            data.renderTime);
        if (this.statusUpdate_) {
            this.statusUpdate_(output);
        }
    }
}
