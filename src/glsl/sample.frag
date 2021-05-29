precision highp float;
uniform highp sampler2D tRGB, tRMET, tRi, tIndex, t2Sphere, t3Sphere, tUniform2, tUniform1, source;
uniform samplerCube tSky;
uniform mat4 invpv;
uniform vec3 eye, bounds, lightPosition, groundColor;
uniform vec2 res, tOffset, invResRand;
uniform float resStage, lightRadius, groundRoughness, groundMetalness, dofDist, dofMag, lightIntensity;

const float epsilon = 0.0001;
const int nBounces = 5;

float randUniform1(inout vec2 randOffset) {
  float r = texture2D(tUniform1, randOffset + tOffset).r;
  randOffset += r;
  return r;
}

vec2 randUniform2(inout vec2 randOffset) {
  vec2 r = texture2D(tUniform2, randOffset + tOffset).ra;
  randOffset += r;
  return r;
}

vec3 rand2Sphere(inout vec2 randOffset) {
  vec3 r = texture2D(t2Sphere, randOffset + tOffset).xyz;
  randOffset += r.xy;
  return r;
}

vec3 rand3Sphere(inout vec2 randOffset) {
  vec3 r = texture2D(t3Sphere, randOffset + tOffset).xyz;
  randOffset += r.xy;
  return r;
}

bool inBounds(vec3 p) {
  if (p.x < 0.0 || p.y < 0.0 || p.z < 0.0) {
    return false;
  }
  if (p.x >= bounds.x || p.y >= bounds.y || p.z >= bounds.z) {
    return false;
  }
  return true;
}

bool rayAABB(vec3 origin, vec3 direction, vec3 bMin, vec3 bMax, out float t0) {
  vec3 invDir = 1.0 / direction;
  vec3 omin = (bMin - origin) * invDir;
  vec3 omax = (bMax - origin) * invDir;
  vec3 imax = max(omax, omin);
  vec3 imin = min(omax, omin);
  float t1 = min(imax.x, min(imax.y, imax.z));
  t0 = max(imin.x, max(imin.y, imin.z));
  t0 = max(t0, 0.0);
  return t1 > t0;
}

vec3 rayAABBNorm(vec3 p, vec3 v) {
  vec3 d = p - (v + 0.5);
  vec3 dabs = abs(d);
  if (dabs.x > dabs.y) {
    if (dabs.x > dabs.z) {
      return vec3(sign(d.x), 0.0, 0.0);
    } else {
      return vec3(0, 0, sign(d.z));
    }
  } else {
    if (dabs.y > dabs.z) {
      return vec3(0.0, sign(d.y), 0.0);
    } else {
      return vec3(0.0, 0.0, sign(d.z));
    }
  }
}

vec2 samplePoint(vec3 v) {
  float invResStage = 1.0 / resStage;
  float i = v.y * bounds.x * bounds.z + v.z * bounds.x + v.x;
  i = i * invResStage;
  float y = floor(i);
  float x = fract(i) * resStage;
  x = (x + 0.5) * invResStage;
  y = (y + 0.5) * invResStage;
  return vec2(x, y);
}


struct VoxelData {
  vec3 xyz;
  vec3 rgb;
  vec2 index;
  float roughness;
  float metalness;
  float emission;
  float transparent;
  float ri;
};

VoxelData floorData(vec3 v) {
  return VoxelData(v, groundColor, vec2(1.0/255.0, 0.0), groundRoughness, groundMetalness, 0.0, 0.0, 1.0);
}

VoxelData airData(vec3 v) {
  return VoxelData(v, vec3(1.0), vec2(0.0), 0.0, 0.0, 0.0, 1.0, 1.0);
}

VoxelData voxelData(vec3 v) {
  VoxelData vd;
  vd.xyz = v;
  if (v.y == -1.0) {
    return floorData(v);
  }
  if (!inBounds(v)) {
    return airData(v);
  }
  vec2 s = samplePoint(v);
  vd.index = texture2D(tIndex, s).ra;
  if (vd.index == vec2(0.0)) return airData(v);
  vd.rgb = texture2D(tRGB, vd.index).rgb;
  vec4 rmet = texture2D(tRMET, vd.index);
  vd.roughness = rmet.r;
  vd.metalness = rmet.g;
  vd.emission = rmet.b;
  vd.transparent = rmet.a;
  vd.ri = texture2D(tRi, vd.index).r;
  return vd;
}

VoxelData intersectFloor(vec3 r0, vec3 r) {
  // NOTE: Assumes this ray actually hits the floor.
  vec3 v = floor(r0 + r * -r0.y/r.y);
  v.y = -1.0;
  return floorData(v);
}

float raySphereIntersect(vec3 r0, vec3 rd, vec3 s0, float sr) {
    float a = dot(rd, rd);
    vec3 s0_r0 = r0 - s0;
    float b = 2.0 * dot(rd, s0_r0);
    float c = dot(s0_r0, s0_r0) - (sr * sr);
    if (b*b - 4.0*a*c < 0.0) {
        return -1.0;
    }
    return (-b - sqrt((b*b) - 4.0*a*c))/(2.0*a);
}

vec3 skyColor(vec3 r0, vec3 r, float sunScale) {
  if (r.y < 0.0) {
    return vec3(0.0);
  }
  vec3 sky = textureCube(tSky, r).rgb;
  if (raySphereIntersect(r0, r, lightPosition, lightRadius) > 0.0) {
    sky += vec3(lightIntensity) * sunScale;
  }
  return sky;
}

bool intersect(vec3 r0, vec3 r, inout VoxelData vd) {
  float tBounds = 0.0;
  vec3 v = vec3(0.0);
  if (!inBounds(r0)) {
    if (!rayAABB(r0, r, vec3(0.0), bounds, tBounds)) {
      if (r.y >= 0.0) {
        return false;
      }
      vd = intersectFloor(r0, r);
      return true;
    }
    r0 = r0 + r * tBounds + r * epsilon;
  }
  v = floor(r0);
  vec3 stp = sign(r);
  vec3 tDelta = 1.0 / abs(r);
  vec3 tMax = step(0.0, r) * (1.0 - fract(r0)) + (1.0 - step(0.0, r)) * fract(r0);
  tMax = tMax/abs(r);
  for (int i = 0; i < 8192; i++) {
    if (!inBounds(v)) {
      if (r.y >= 0.0) {
        return false;
      }
      vd = intersectFloor(r0, r);
      return true;
    }
    vec2 lastIndex = vd.index;
    vd = voxelData(v);
    if (lastIndex != vd.index) {
      return true;
    }
    vec3 s = vec3(
      step(tMax.x, tMax.y) * step(tMax.x, tMax.z),
      step(tMax.y, tMax.x) * step(tMax.y, tMax.z),
      step(tMax.z, tMax.x) * step(tMax.z, tMax.y)
    );
    v += s * stp;
    tMax += s * tDelta;
  }
  return false;
}


void main() {

  vec4 src = texture2D(source, gl_FragCoord.xy/res);

  vec2 randOffset = vec2(0.0);

  // Recover NDC
  vec2 jitter = randUniform2(randOffset) - 0.5;
  vec4 ndc = vec4(
    2.0 * (gl_FragCoord.xy + jitter) / res - 1.0,
    2.0 * gl_FragCoord.z - 1.0,
    1.0
  );

  // Calculate clip
  vec4 clip = invpv * ndc;

  // Calculate 3D position
  vec3 p3d = clip.xyz / clip.w;

  vec3 ray = normalize(p3d - eye);
  vec3 r0 = eye;

  float ddof = dofDist * length(bounds) + length(0.5 * bounds - eye) - length(bounds) * 0.5;
  vec3 tdof = r0 + ddof * ray;
  r0 += rand2Sphere(randOffset) * dofMag;
  ray = normalize(tdof - r0);

  vec3 mask = vec3(1.0);
  vec3 accm = vec3(0.0);

  VoxelData vd = airData(floor(r0));

  bool reflected = false;
  for (int b = 0; b < nBounces; b++) {
    bool refracted = false;
    float lastRi = vd.ri;
    if (intersect(r0, ray, vd)) {
      if (vd.emission > 0.0) {
        accm += mask * vd.emission * vd.rgb;
        break;
      }
      float tVoxel = 0.0;
      rayAABB(r0, ray, vd.xyz, vd.xyz + 1.0, tVoxel);
      vec3 r1 = r0 + tVoxel * ray;
      vec3 n = rayAABBNorm(r1, vd.xyz);
      vec3 m = normalize(n + rand3Sphere(randOffset) * vd.roughness);
      vec3 diffuse = normalize(m + rand2Sphere(randOffset));
      vec3 ref = reflect(ray, m);
      if (randUniform1(randOffset) <= vd.metalness) {
        // metallic
        ray = ref;
        reflected = true;
        mask *= vd.rgb;
      } else {
        // nonmetallic
        const float F0 = 0.0;
        float F = F0 + (1.0 - F0) * pow(1.0 - dot(-ray, n), 5.0);
        if (randUniform1(randOffset) <= F) {
          // reflect
          ray = ref;
          reflected = true;
        } else {
          // diffuse
          mask *= vd.rgb;
          if (randUniform1(randOffset) <= vd.transparent) {
            // attempt refraction
            ray = refract(ray, m, lastRi/vd.ri);
            if (ray != vec3(0.0)) {
              // refracted
              ray = normalize(ray);
              refracted = true;
              reflected = false;
            } else {
              // total internal refraction, use reflection.
              ray = ref;
              refracted = false;
              reflected = true;
            }
          } else {
            // diffuse reflection
            ray = diffuse;
            reflected = false;
          }
        }
      }
      if (!refracted && dot(ray, n) < 0.0) {
        accm = vec3(0.0);
        break;
      }
      r0 = r1 + ray * epsilon;
      vd = voxelData(floor(r0));
      if (ray == diffuse) {
        // Perform next event estimation when a diffuse bounce occurs.
        vec3 pLight = lightPosition + rand2Sphere(randOffset) * lightRadius;
        vec3 rLight = normalize(pLight - r0);
        VoxelData _vd;
        if (!intersect(r0, rLight, _vd)) {
          accm += mask * skyColor(r0, rLight, 0.5) * clamp(dot(rLight, m), 0.0, 1.0);
        }
      }
    } else {
      accm += mask * skyColor(r0, ray, b == 0 ? 1.0 : 0.0).rgb;
      break;
    }
  }

  gl_FragColor = vec4(accm, 1) + src;
}
