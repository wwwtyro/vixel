const Vixel = require("..");

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const vixel = new Vixel(canvas, 1, 1, 1);

vixel.camera([2, 1.5, 2], [0.5, 0.5, 0.5], [0, 1, 0], Math.PI / 3);

vixel.set(0, 0, 0, {
  red: 1,
  green: 0.5,
  blue: 0.25,
});

vixel.sample(1024);
vixel.display();
