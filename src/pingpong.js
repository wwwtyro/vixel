"use strict";

module.exports = function PingPong(regl, opts) {
  const fbos = [regl.framebuffer(opts), regl.framebuffer(opts)];

  let index = 0;

  function ping() {
    return fbos[index];
  }

  function pong() {
    return fbos[1 - index];
  }

  function swap() {
    index = 1 - index;
  }

  function resize(width, height) {
    opts.width = width;
    opts.height = height;
    ping()(opts);
    pong()(opts);
  }

  return {
    ping: ping,
    pong: pong,
    swap: swap,
    resize: resize
  };
};
