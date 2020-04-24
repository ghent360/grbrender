import * as cnv from "canvas";
import * as fs from "fs";
import * as path from "path";

function getX (angle:number):number {
    return -Math.sin(angle + Math.PI)
}
  
function getY (angle:number):number {
    return Math.cos(angle + Math.PI)
}

function clock(ctx:cnv.CanvasRenderingContext2D, size:number):void {
    let x:number, y:number, i:number;
    let now = new Date();
    let radius = size/2;
  
    ctx.clearRect(0, 0, size, size);
  
    ctx.save();
  
    ctx.translate(radius, radius);
    ctx.beginPath();
    ctx.lineWidth = radius/14;
    ctx.strokeStyle = '#325FA2';
    ctx.fillStyle = '#eeeeee';
    ctx.arc(0, 0, radius*0.8875, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fill();
  
    // Hour marks
    ctx.lineWidth = radius/20;
    ctx.strokeStyle = '#000000';
    for (i = 0; i < 12; i++) {
      x = getX(Math.PI / 6 * i);
      y = getY(Math.PI / 6 * i);
      ctx.beginPath();
      ctx.moveTo(x * radius*0.625, y * radius*0.625);
      ctx.lineTo(x * radius*0.78, y * radius*0.78);
      ctx.stroke();
    }
  
    // Minute marks
    ctx.lineWidth = radius/25;
    ctx.strokeStyle = '#000000';
    for (i = 0; i < 60; i++) {
      if (i % 5 !== 0) {
        x = getX(Math.PI / 30 * i);
        y = getY(Math.PI / 30 * i);
        ctx.beginPath();
        ctx.moveTo(x * radius*0.73, y * radius*0.73);
        ctx.lineTo(x * radius*0.78, y * radius*0.78);
        ctx.stroke();
      }
    }
  
    let sec = now.getSeconds();
    let min = now.getMinutes();
    let hr = now.getHours() % 12;
  
    ctx.fillStyle = 'black';
  
    // Write hours
    x = getX(hr * (Math.PI / 6) + (Math.PI / 360) * min + (Math.PI / 21600) * sec);
    y = getY(hr * (Math.PI / 6) + (Math.PI / 360) * min + (Math.PI / 21600) * sec);
    ctx.lineWidth = radius/14;
    ctx.beginPath();
    ctx.moveTo(x * -radius/8, y * -radius/8);
    ctx.lineTo(x * radius/2, y * radius/2);
    ctx.stroke();
  
    // Write minutes
    x = getX((Math.PI / 30) * min + (Math.PI / 1800) * sec);
    y = getY((Math.PI / 30) * min + (Math.PI / 1800) * sec);
  
    ctx.lineWidth = radius/16;
    ctx.beginPath();
    ctx.moveTo(x * -radius*0.175, y * -radius*0.175);
    ctx.lineTo(x * radius*0.7, y * radius*0.7);
    ctx.stroke();
  
    // Write seconds
    x = getX(sec * Math.PI / 30);
    y = getY(sec * Math.PI / 30);
    ctx.strokeStyle = '#D40000';
    ctx.fillStyle = '#D40000';
    ctx.lineWidth = radius/22;
    ctx.beginPath();
    ctx.moveTo(x * -radius*0.1875, y * -radius*0.1875);
    ctx.lineTo(x * radius*0.8, y * radius*0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius/16, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x * radius*0.6, y * radius*0.6, radius/16, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fillStyle = '#555';
    ctx.arc(0, 0, radius/23, 0, Math.PI * 2, true);
    ctx.fill();
  
    ctx.restore();
}

function main():void {
    let size = 4000;
    let cv = cnv.createCanvas(size, size);
    let ctx = cv.getContext('2d');
    clock(ctx, size);
    cv.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'clock.png')));
    //setTimeout(main, 5000);
}

main();