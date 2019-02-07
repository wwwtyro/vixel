"use strict";

const { mat4, vec3 } = require("gl-matrix");

module.exports = class Camera {
  constructor(domElement) {
    this.domElement = domElement;
    this.fov = Math.PI / 6;
    this.eye = [0, 0, 4];
    this.center = [0, 0, 0];
    this.up = [0, 1, 0];
  }

  view() {
    return mat4.lookAt([], this.eye, this.center, this.up);
  }

  projection() {
    return mat4.perspective(
      [],
      this.fov,
      this.domElement.width / this.domElement.height,
      0.1,
      1000
    );
  }

  invpv() {
    const v = this.view();
    const p = this.projection();
    const pv = mat4.multiply([], p, v);
    return mat4.invert([], pv);
  }

  serialize() {
    return {
      version: 0,
      fov: this.fov,
      eye: this.eye,
      center: this.center,
      up: this.up
    };
  }

  deserialize(data) {
    // TODO: make this static & return new Camera object
    this.fov = data.fov;
    this.eye = data.eye;
    this.center = data.center;
    this.up = data.up;
  }
};
