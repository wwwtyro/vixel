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
    this.keys = {};
  }

  get(v) {
    const h = `${v.red} ${v.green} ${v.blue} ${v.rough} ${v.metal} ${v.emit} ${
      v.transparent
    } ${v.refract}`;
    if (this.keys[h] === undefined) {
      // It's cool that we're skipping the first two indices, because those will be a shortcut for air and ground.
      this.x++;
      if (this.x > 255) {
        this.x = 0;
        this.y++;
        if (this.y > 255) {
          throw new Error("Exceeded voxel type limit of 65536");
        }
      }
      this.keys[h] = [this.x, this.y];
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
    return this.keys[h];
  }
};
