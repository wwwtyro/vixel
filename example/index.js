const Vixel = require("../index");

const canvas = document.getElementById("render-canvas");
canvas.width = 512;
canvas.height = 768;

const bounds = [64, 32, 22];

const vixel = new Vixel(canvas, ...bounds);

vixel.camera(
  [bounds[0] * 1.35, bounds[1] * 0.75, bounds[2] * 0.5],
  [bounds[0] * 0.5, bounds[1] * 0, bounds[2] * 0.5],
  [0, 1, 0],
  Math.PI / 2.8
);

vixel.dof(0.5, 0.25);

vixel.sun(17, (1.5 * Math.PI) / 2, 1, 1);

// Ground
for (let x = 0; x < bounds[0]; x++) {
  for (let z = 0; z < bounds[2]; z++) {
    vixel.set(x, 0, z, {
      red: 0.125,
      green: 0.06125,
      blue: 0.01,
    });
  }
}

// Random walk
let x = bounds[0] * 0.5;
let z = bounds[2];
for (let i = 0; i < 2 ** 11; i++) {
  x += Math.round(Math.random() * 2) - 1;
  z += Math.round(Math.random() * 2) - 1;
  x = ((x % bounds[0]) + bounds[0]) % bounds[0];
  z = ((z % bounds[2]) + bounds[2]) % bounds[2];
  for (let y = bounds[1] - 1; y > 0; y--) {
    if (vixel.get(x, y - 1, z)) {
      const opts = {
        red: 0.25,
        green: 0.25,
        blue: 0.25,
      };
      if (Math.random() < 0.03) {
        opts.emit = 8;
      }
      vixel.set(x, y, z, opts);
      break;
    }
  }
}

// Water
for (let x = 0; x < bounds[0]; x++) {
  for (let y = 1; y < bounds[1] * 0.125; y++) {
    for (let z = 0; z < bounds[2]; z++) {
      if (!vixel.get(x, y, z)) {
        vixel.set(x, y, z, {
          red: 0.125,
          green: 1,
          blue: 0.75,
          transparent: 1,
          refract: 1.333,
          rough: 0.1,
        });
      }
    }
  }
}

let samples = 0;

function loop() {
  vixel.sample(2);
  vixel.display();
  samples += 2;
  if (samples < 1024) {
    requestAnimationFrame(loop);
  }
}

loop();
