function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Could not compile shader: " + info);
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Could not link program: " + info);
  }
  return program;
}

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const mandelbrotFragmentShaderSource = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_center_high;
uniform vec2 u_center_low;
uniform float u_zoom;
const int MAX_ITER = 2500;

// Double-precision addition function
vec2 add(vec2 a, vec2 b) {
  float sum = a.x + b.x;
  float err = sum - a.x;
  float lowPart = ((b.x - err) + (a.x - (sum - err))) + a.y + b.y;
  return vec2(sum, lowPart);
}

// Double-precision multiplication function
vec2 mul(vec2 a, vec2 b) {
  float prodHigh = a.x * b.x;
  float prodLow = a.x * b.y + a.y * b.x + a.y * b.y;
  return vec2(prodHigh, prodLow);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 2.0 / u_zoom;
  c.x *= u_resolution.x / u_resolution.y;

  // c += u_center;
  // c += u_center_high;
  // c += u_center_low;
  c = add(c, add(u_center_high, u_center_low));

  vec2 z = vec2(0.0, 0.0);
  vec2 z_high = vec2(0.0);
  vec2 z_low = vec2(0.0);
  int iter = 0;

  for (int i = 0; i < MAX_ITER; i++) {
    if (dot(z_high, z_high) > 2.0) break;

    // Z2.xz = DoubleMul(Z.xz,Z.xz) - DoubleMul(Z.yw,Z.yw);
		// Z2.yw = 2.0*DoubleMul(Z.xz,Z.yw);
		// Z = Z2 + C; // apply panning

    vec2 z_squared = vec2(
      z_high.x * z_high.x - z_low.y * z_low.y, // Real part
      2.0 * z_high.x * z_high.y + 2.0 * z_low.x * z_low.y // Imaginary part should also include z_high.y
    );
    z_high = add(z_squared, c);
    vec2 z_high_squared = mul(z_high, z_high);
    z_low = add(z_low, z_high_squared);

    // if (length(z) > 2.0) break;
    // z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);

    iter++;
  }
  float color = float(iter) / float(MAX_ITER);
  gl_FragColor = vec4(vec3(color), 1.0);
}
`;

export function createMandelbrotProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    mandelbrotFragmentShaderSource
  );
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const centerLocation = gl.getUniformLocation(program, "u_center");
  const centerHighLocation = gl.getUniformLocation(program, "u_center_high");
  const centerLowLocation = gl.getUniformLocation(program, "u_center_low");
  const zoomLocation = gl.getUniformLocation(program, "u_zoom");

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  return {
    resolutionLocation,
    centerLocation,
    centerHighLocation,
    centerLowLocation,
    zoomLocation,
  };
}
