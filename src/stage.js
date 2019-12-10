"use strict";

const VoxelIndex = require("./voxel-index");

module.exports = class Stage {
  constructor(regl, width, height, depth) {
    this.regl = regl;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.data = new Map();
    this.vIndex = new VoxelIndex();
    this.tIndex = regl.texture();
    this.tRGB = regl.texture();
    this.tRMET = regl.texture();
    this.tRi = regl.texture();

    this.keyYFactor = this.width * this.height;
    this.keyXFactor = this.keyYFactor * this.keyYFactor;
  }

  key(x, y, z) {
    return x * this.keyXFactor + y * this.keyYFactor + z;
  }

  set(
    x,
    y,
    z,
    {
      red = 1,
      green = 1,
      blue = 1,
      rough = 1,
      metal = 0,
      emit = 0,
      transparent = 0,
      refract = 1
    } = {}
  ) {
    if (x < 0 || x >= this.width) throw new Error("Vixel: set out of bounds.");
    if (y < 0 || y >= this.height) throw new Error("Vixel: set out of bounds.");
    if (z < 0 || z >= this.depth) throw new Error("Vixel: set out of bounds.");
    this.data.set(this.key(x, y, z), {
      x,
      y,
      z,
      red: Math.round(red * 255),
      green: Math.round(green * 255),
      blue: Math.round(blue * 255),
      rough,
      metal,
      emit,
      transparent,
      refract
    });
  }

  unset(x, y, z) {
    if (Object.keys(this.data).length === 1) return;
    delete this.data[this.key(x, y, z)];
  }

  get(x, y, z) {
    return this.data.get(this.key(x, y, z));
  }

  clear() {
    this.vIndex.clear();
    this.data = {};
  }

  update() {
    this.textureSize = 1;
    while (
      this.textureSize * this.textureSize <
      this.width * this.height * this.depth
    ) {
      this.textureSize *= 2;
    }
    const aIndex = new Uint8Array(this.textureSize * this.textureSize * 2);
    aIndex.fill(0);
    for (let v of this.data.values()) {
      const vi = this.vIndex.get(v);
      const ai = v.y * this.width * this.depth + v.z * this.width + v.x;
      aIndex[ai * 2 + 0] = vi[0];
      aIndex[ai * 2 + 1] = vi[1];
    }
    this.tIndex({
      width: this.textureSize,
      height: this.textureSize,
      format: "luminance alpha",
      data: aIndex
    });
    this.tRGB({
      width: 256,
      height: 256,
      format: "rgb",
      data: this.vIndex.aRGB
    });
    this.tRMET({
      width: 256,
      height: 256,
      format: "rgba",
      type: "float",
      data: this.vIndex.aRMET
    });
    this.tRi({
      width: 256,
      height: 256,
      format: "rgba",
      type: "float",
      data: this.vIndex.aRi
    });
  }

  serialize() {
    const out = {
      version: 0
    };
    out.width = this.width;
    out.height = this.height;
    out.depth = this.depth;
    out.xyz = [];
    out.rgb = [];
    out.rough = [];
    out.metal = [];
    out.emit = [];
    out.transparent = [];
    out.refract = [];
    for (let v of this.data.values()) {
      out.xyz.push(v.x, v.y, v.z);
      out.rgb.push(v.red, v.green, v.blue);
      out.rough.push(+v.rough.toFixed(3));
      out.metal.push(+v.metal.toFixed(3));
      out.emit.push(+v.emit.toFixed(3));
      out.transparent.push(+v.transparent.toFixed(3));
      out.refract.push(+v.refract.toFixed(3));
    }
    return out;
  }

  deserialize(d) {
    this.clear();
    this.width = d.width;
    this.height = d.height;
    this.depth = d.depth;
    for (let i = 0; i < d.xyz.length / 3; i++) {
      this.set(d.xyz[i * 3 + 0], d.xyz[i * 3 + 1], d.xyz[i * 3 + 2], {
        red: d.rgb[i * 3 + 0] / 255,
        green: d.rgb[i * 3 + 1] / 255,
        blue: d.rgb[i * 3 + 2] / 255,
        rough: d.rough[i],
        metal: d.metal[i],
        emit: d.emit[i],
        transparent: d.transparent[i],
        refract: d.refract[i]
      });
    }
  }
};
