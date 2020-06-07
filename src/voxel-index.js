"use strict";

module.exports = class VoxelIndex {
  constructor() {
    this.aRGB = new Uint8Array(256 * 256 * 3);
    this.aRMET = new Float32Array(256 * 256 * 4);
    this.aRi = new Float32Array(256 * 256 * 4);
    this.clear();
  }

  clear() {
    this.aRGB.fill(0);
    this.aRMET.fill(0);
    this.aRi.fill(0);
    this.x = 1;
    this.y = 0;
    this.keys = new Map();
  }

  key(v) {
    const vals = [v.red, v.green, v.blue, v.rough, v.metal, v.emit, v.transparent, v.refract];
    let h = '';
    for (let i = 0; i < vals.length; i++) {
      h += String.fromCharCode(vals[i]);
    }
    return h
  }

  set(v) {
    const h = this.key(v)
    if (!this.keys.has(h)) {
      // It's cool that we're skipping the first two indices, because those will be a shortcut for air and ground.
      this.x++;
      if (this.x > 255) {
        this.x = 0;
        this.y++;
        if (this.y > 255) {
          throw new Error("Exceeded voxel type limit of 65536");
        }
      }
      this.keys.set(h, [this.x, this.y]);
      const i = this.y * 256 + this.x;
      this.aRGB[i * 3 + 0] = v.red;
      this.aRGB[i * 3 + 1] = v.green;
      this.aRGB[i * 3 + 2] = v.blue;
      this.aRMET[i * 4 + 0] = v.rough;
      this.aRMET[i * 4 + 1] = v.metal;
      this.aRMET[i * 4 + 2] = v.emit;
      this.aRMET[i * 4 + 3] = v.transparent;
      this.aRi[i * 4 + 0] = v.refract;
    }

    return h;
  }

  get(h) {
    return this.keys.get(h);
  }
};
