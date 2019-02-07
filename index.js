const { vec3 } = require("gl-matrix");
const Renderer = require("./src/render");
const Stage = require("./src/stage");
const Camera = require("./src/camera");

module.exports = class Vixel {
  constructor(canvas, width, height, depth) {
    this._canvas = canvas;
    this._renderer = Renderer(this._canvas);
    this._stage = new Stage(this._renderer.context, width, height, depth);
    this._camera = new Camera(this._canvas);
    this._ground = {
      color: [1, 1, 1],
      rough: 1,
      metal: 0
    };
    this._sun = {
      time: 6,
      azimuth: 0,
      radius: 8,
      intensity: 1
    };
    this._dof = {
      distance: 0.5,
      magnitude: 0
    };
    this._renderDirty = true;
    this._stageDirty = true;
    this._canvas._vxOldsize = [this._canvas.width, this._canvas.height];
  }

  set(x, y, z, opts) {
    this._stage.set(x, y, z, opts);
    this._stageDirty = true;
  }

  unset(x, y, z) {
    this._stage.unset(x, y, z);
    this._stageDirty = true;
  }

  get(x, y, z) {
    return this._stage.get(x, y, z);
  }

  clear() {
    this._stage.clear();
    this._stageDirty = true;
  }

  serialize() {
    return {
      stage: this._stage.serialize(),
      camera: this._camera.serialize(),
      dof: JSON.parse(JSON.stringify(this._dof)),
      sun: JSON.parse(JSON.stringify(this._sun)),
      ground: JSON.parse(JSON.stringify(this._ground))
    };
  }

  deserialize(data) {
    this._stage.deserialize(data.stage);
    this._camera.deserialize(data.camera);
    this._dof = JSON.parse(JSON.stringify(data.dof));
    this._sun = JSON.parse(JSON.stringify(data.sun));
    this._ground = JSON.parse(JSON.stringify(data.ground));
    this._stageDirty = true;
    this._renderDirty = true;
  }

  get sampleCount() {
    return this._renderer.sampleCount();
  }

  camera(eye, center, up, fov) {
    if (
      `${eye} ${center} ${up} ${fov}` ===
      `${this._camera.eye} ${this._camera.center} ${this._camera.up} ${
        this._camera.fov
      }`
    ) {
      return;
    }
    this._camera.eye = eye.slice();
    this._camera.center = center.slice();
    this._camera.up = up.slice();
    this._camera.fov = fov;
    this._renderDirty = true;
  }

  ground(color, rough, metal) {
    if (
      `${color} ${rough} ${metal}` ===
      `${this._ground.color} ${this._ground.rough} ${this._ground.metal}`
    ) {
      return;
    }
    this._ground = {
      color,
      rough,
      metal
    };
    this._renderDirty = true;
  }

  sun(time, azimuth, radius, intensity) {
    if (
      `${time} ${azimuth} ${radius} ${intensity}` ===
      `${this._sun.time} ${this._sun.azimuth} ${this._sun.radius} ${
        this._sun.intensity
      }`
    ) {
      return;
    }
    this._sun = {
      time,
      azimuth,
      radius,
      intensity
    };
    this._renderDirty = true;
  }

  dof(distance, magnitude) {
    if (
      `${distance} ${magnitude}` ===
      `${this._dof.distance} ${this._dof.magnitude}`
    ) {
      return;
    }
    this._dof = {
      distance,
      magnitude
    };
    this._renderDirty = true;
  }

  sample(count) {
    if (
      this._canvas._vxOldsize[0] !== this._canvas.width ||
      this._canvas._vxOldsize[1] !== this._canvas.height
    ) {
      this._canvas._vxOldsize = [this._canvas.width, this._canvas.height];
      this._renderDirty = true;
    }
    if (this._stageDirty) {
      this._stage.update();
      this._renderDirty = true;
      this._stageDirty = false;
    }
    if (this._renderDirty) {
      this._renderer.reset();
      this._renderDirty = false;
    }
    this._renderer.sample(this._stage, this._camera, {
      groundColor: this._ground.color,
      groundRoughness: this._ground.rough,
      groundMetalness: this._ground.metal,
      time: this._sun.time,
      azimuth: this._sun.azimuth,
      lightRadius: this._sun.radius,
      lightIntensity: this._sun.intensity,
      dofDist: this._dof.distance,
      dofMag: this._dof.magnitude,
      count: count
    });
  }

  display() {
    this._renderer.display();
  }
};
