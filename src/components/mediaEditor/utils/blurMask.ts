const vertexShaderSource = `#version 300 es

  in vec2 position;
  out vec2 v_coord;

  void main() {
    gl_Position = vec4(position, 0, 1);
    v_coord = gl_Position.xy * 0.5 + 0.5;
  }
`;

const fragmentShaderSource =
    `#version 300 es

    precision mediump float;
    in highp vec2 v_coord;
    out vec4 fragColor;
    uniform sampler2D uImage;
    uniform sampler2D uMask;
    uniform sampler2D uBrush;
   


    vec4 applyBlur( vec2 texCoord) {
        float blurSize = 0.005;
        vec4 blurColor = vec4(0.0);
        float total = 0.0;
        float firstPassBlur = 3.0;
        
        for (float dx = -firstPassBlur; dx <= firstPassBlur; dx++) {
            for (float dy = -firstPassBlur; dy <= firstPassBlur; dy++) {
                vec2 offset = vec2(dx, dy) * blurSize;
                vec4 color1 =  texture(uImage, texCoord + offset);
                vec4 color2 =  texture(uBrush, texCoord + offset);                 
                blurColor += mix(color1, color2, color2.a);
                total += 1.0;
            }
        }

        return blurColor / total;
    }


    void main(void) {          
        float maskValue = texture(uMask, vec2(v_coord.x, 1.0 - v_coord.y)).a;
        if (maskValue > 0.0) {           
                    
            fragColor = applyBlur(vec2(v_coord.x, 1.0 - v_coord.y));
             fragColor.a = 1.0;
        }
        else {
            fragColor = vec4(0.0);
        }
       
    }
    `;


export class BlurMask {
    private _canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;

    private brushCanvas: HTMLCanvasElement;
    private textureBase: WebGLTexture;
    private textureMask: WebGLTexture;
    private textureBrush: WebGLTexture;


    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    constructor(brushCanvas: HTMLCanvasElement) {
        this.brushCanvas = brushCanvas;
        this._canvas = document.createElement('canvas');
        const gl = this.gl = this._canvas.getContext('webgl2');

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.createProgram(gl, vertexShader, fragmentShader);
        const positionAttributeLocation = gl.getAttribLocation(this.program, 'position');

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enable(gl.ALPHA_BITS)
        gl.useProgram(this.program);
        gl.enableVertexAttribArray(positionAttributeLocation);
        
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

       
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, -1, 1, 1, -1,
            1, 1, 1, -1, -1, 1,
        ]), gl.STATIC_DRAW);


        this.textureBase = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBase);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);




        this.textureMask = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMask);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);



        this.textureBrush = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBrush);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }


    public resize(width: number, height: number) {
        this._canvas.width = width;
        this._canvas.height = height
        this.gl.viewport(0, 0, width, height);

    }

    public updateBase(base: HTMLCanvasElement) {
      
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.textureBase);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);
        const textureLocation1 = gl.getUniformLocation(this.program, "uImage");
        gl.uniform1i(textureLocation1, 0);

    }

    public updateMask(mask: HTMLCanvasElement) {        
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.textureMask);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
        const textureLocation1 = gl.getUniformLocation(this.program, "uMask");
        gl.uniform1i(textureLocation1, 1);



        gl.bindTexture(gl.TEXTURE_2D, this.textureBrush);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.brushCanvas);
        const textureLocation2 = gl.getUniformLocation(this.program, "uBrush");
        gl.uniform1i(textureLocation2, 2);
    }

    private createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            console.log(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
        }

        return program;
    }


    private createShader(gl: WebGLRenderingContext, type: GLenum, shaderSource: string) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            console.warn(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
        }

        return shader;
    }

    public darw() {
        const gl = this.gl

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}