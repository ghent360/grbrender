import {GerberRenderer} from './grbrender';
import * as fs from 'fs';

function main():void {
    let gr = new GerberRenderer();
    gr.readZipFile("test.zip");
}

main();