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
    
    in vec2 v_coord;
    out vec4 fragColor;

   
    uniform sampler2D u_texture;
    uniform sampler2D u_inputImageTexture;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform float u_saturation;
    uniform float u_warmth;
    uniform float u_fade;
    uniform float u_grain;
    uniform float u_sharpen;
    uniform float u_vignette;
    uniform float u_shadow;
    uniform float u_highlight;
    uniform float u_enhance;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float enhance(float value) {
        const vec2 offset = vec2(0.001953125, 0.03125);
        value = value + offset.x;
        vec2 coord = (clamp(v_coord, 0.125, 1.0 - 0.125001) - 0.125) * 4.0;
        vec2 frac = fract(coord);
        coord = floor(coord);
        float p00 = float(coord.y * 4.0 + coord.x) * 0.0625 + offset.y;
        float p01 = float(coord.y * 4.0 + coord.x + 1.0) * 0.0625 + offset.y;
        float p10 = float((coord.y + 1.0) * 4.0 + coord.x) * 0.0625 + offset.y;
        float p11 = float((coord.y + 1.0) * 4.0 + coord.x + 1.0) * 0.0625 + offset.y;
        vec3 c00 = texture(u_inputImageTexture, vec2(value, p00)).rgb;
        vec3 c01 = texture(u_inputImageTexture, vec2(value, p01)).rgb;
        vec3 c10 = texture(u_inputImageTexture, vec2(value, p10)).rgb;
        vec3 c11 = texture(u_inputImageTexture, vec2(value, p11)).rgb;
        float c1 = ((c00.r - c00.g) / (c00.b - c00.g));
        float c2 = ((c01.r - c01.g) / (c01.b - c01.g));
        float c3 = ((c10.r - c10.g) / (c10.b - c10.g));
        float c4 = ((c11.r - c11.g) / (c11.b - c11.g));
        float c1_2 = mix(c1, c2, frac.x);
        float c3_4 = mix(c3, c4, frac.x);
        return mix(c1_2, c3_4, frac.y);
    }

    vec3 hsv_to_rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
        vec4 sampleColor = texture(u_texture, vec2(v_coord.x, 1.0 - v_coord.y));

        //ENHANCE
        vec4 texel = sampleColor;
        vec4 hsv = texel;
        hsv.y = min(1.0, hsv.y * 1.2);
        hsv.z = min(1.0, enhance(hsv.z) * 1.1);
        sampleColor = vec4((mix(texel.xyz, hsv.xyz, u_enhance)), texel.w);// sampleColor = vec4(hsv_to_rgb(mix(texel.xyz, hsv.xyz, u_enhance)), texel.w);???
        
        //BRIGHTNESS
        sampleColor.rgb += u_brightness;


        //CONTRAST
        sampleColor.rgb = (sampleColor.rgb-0.5) * (u_contrast + 1.0) +0.5;


        //SATURATION
        float gray = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        sampleColor.rgb = mix(vec3(gray), sampleColor.rgb, u_saturation + 1.0);


        //WARMTH
        sampleColor.r += u_warmth;
        sampleColor.b -= u_warmth;


        //SHADOWS              
        if (dot(sampleColor.rgb, vec3(0.3)) < 0.35) {
            sampleColor.rgb *= (1.0 - -u_shadow);
        }


        //HIGHLIGHT
          if (dot(sampleColor.rgb, vec3(0.3)) > 0.65) {
            sampleColor.rgb *= (1.0 - -u_highlight);
        }


        //FADE
          //sampleColor.a = sampleColor.a*u_fade;
             sampleColor = mix(sampleColor, vec4(0.5,0.5,0.5,1.0), u_fade/2.0) * vec4(1.0,1.0,1.0,sampleColor.a);

        //GRAIN
        float grain = (random(gl_FragCoord.xy) - 0.5) * u_grain;
        sampleColor.rgb += grain;


        //SHARPEN       
        vec2 texSize = vec2(textureSize(u_texture, 0));
        vec2 texelSize = 1.0 / texSize;        
        vec2 coord = vec2(v_coord.x, 1.0 - v_coord.y);

        vec4 sum = 
         texture(u_texture, coord - texelSize * vec2(-1.0, -1.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(0.0, -1.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(1.0, -1.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(-1.0, 0.0)) * -1.0
        + texture(u_texture, coord) * 8.0
        + texture(u_texture, coord - texelSize * vec2(1.0, 0.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(-1.0, 1.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(0.0, 1.0)) * -1.0
        + texture(u_texture, coord - texelSize * vec2(1.0, 1.0)) * -1.0;
                              
        sampleColor = vec4((sampleColor + u_sharpen * sum).rgb, sampleColor.a);


        //VIGNETTE
        if(u_vignette > 0.0){      
            vec2 position = v_coord - vec2(0.5);
            float len = length(position);
            float radius =0.5;
            float softness =  -(1.0- u_vignette); 
            sampleColor.rgb *= (1.0-smoothstep(radius, radius - softness, len));
        }
        


        fragColor = sampleColor;
    }
`;

const PGPhotoEnhanceSegments = 4;
const PGPhotoEnhanceHistogramBins = 256;

export class ImageProcessor {
    private gl: WebGLRenderingContext;
    private canvas: HTMLCanvasElement
    private program: WebGLProgram;
    image: HTMLImageElement;
    cdtBuffer: Uint8Array;
    texture2: WebGLTexture;


    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = this.gl = canvas.getContext('webgl2');

        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.createProgram(gl, vertexShader, fragmentShader);
        const positionAttributeLocation = gl.getAttribLocation(this.program, 'position');
        const colorUniformLocation = gl.getUniformLocation(this.program, 'color');

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
    }


    public setImage(image: HTMLImageElement) {
        const gl = this.gl;

        this.image = image;
        const width = image.width;
        const height = image.height;
        const hsvBuffer = new Uint8Array(4 * width * height);
        this.cdtBuffer = new Uint8Array(PGPhotoEnhanceSegments * PGPhotoEnhanceSegments * PGPhotoEnhanceHistogramBins * 4); // Buffer for CDT
        const calcBuffer = new Uint8Array(PGPhotoEnhanceSegments * PGPhotoEnhanceSegments * 2 * 4 * (1 + PGPhotoEnhanceHistogramBins)); // Calculation buffer

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');    
        canvas.width = width;
        canvas.height = height;       
        ctx.drawImage(image, 0, 0, width, height);      
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixelData = imageData.data;
        
        for (let i = 0; i < pixelData.length; i += 4) {          
            hsvBuffer[i] = pixelData[i]; 
            hsvBuffer[i + 1] = pixelData[i + 1];
            hsvBuffer[i + 2] = pixelData[i + 2]; 
            hsvBuffer[i + 3] = pixelData[i + 3];
        }

        this.cdtBuffer = this.calcCDT(hsvBuffer, width, height, this.cdtBuffer, calcBuffer);


        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);


        const textureLocation1 = gl.getUniformLocation(this.program, "u_texture");
        gl.uniform1i(textureLocation1, 0);



        this.texture2 = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.texture2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        gl.bindTexture(gl.TEXTURE_2D, this.texture2);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.cdtBuffer);


        const textureLocation2 = gl.getUniformLocation(this.program, "u_inputImageTexture");
        gl.uniform1i(textureLocation2, 1);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    public updateImage(settings: FilterSettings) {
        const gl = this.gl
       
        for (let key in settings) {
            const customVariableLocation = gl.getUniformLocation(this.program, `u_${key}`);
            // @ts-ignore
            gl.uniform1f(customVariableLocation, settings[key]);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);       
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

    calcCDT(hsvBuffer: Uint8Array, width: number, height: number, buffer: Uint8Array, calcBuffer: Uint8Array) {
        const imageWidth: number = width;
        const imageHeight: number = height;
        const _clipLimit: number = 1.25;

        const totalSegments: number = PGPhotoEnhanceSegments * PGPhotoEnhanceSegments;
        const tileArea: number = Math.floor(imageWidth / PGPhotoEnhanceSegments) * Math.floor(imageHeight / PGPhotoEnhanceSegments);
        const clipLimit: number = Math.max(1, _clipLimit * tileArea / PGPhotoEnhanceHistogramBins);
        const scale: number = 255.0 / tileArea;

        const bytes: Uint8Array = hsvBuffer;
        const calcBytes: Uint32Array = new Uint32Array(calcBuffer.buffer);
        const result: Uint8Array = buffer;

        const cdfsMin: Uint32Array = calcBytes;
        const cdfsMax: Uint32Array = new Uint32Array(calcBuffer.buffer, totalSegments * 4, totalSegments);
        const cdfs: Uint32Array = new Uint32Array(calcBuffer.buffer, totalSegments * 8, totalSegments * PGPhotoEnhanceHistogramBins);
        const hist: Uint32Array = new Uint32Array(calcBuffer.buffer, totalSegments * 8 + totalSegments * PGPhotoEnhanceHistogramBins * 4, totalSegments * PGPhotoEnhanceHistogramBins);

        hist.fill(0);

        const xMul: number = PGPhotoEnhanceSegments / imageWidth;
        const yMul: number = PGPhotoEnhanceSegments / imageHeight;

        for (let i = 0; i < imageHeight; i++) {
            const yOffset: number = i * width * 4;
            for (let j = 0; j < imageWidth; j++) {
                const index: number = j * 4 + yOffset;

                const tx: number = Math.floor(j * xMul);
                const ty: number = Math.floor(i * yMul);
                const t: number = ty * PGPhotoEnhanceSegments + tx;

                hist[t * PGPhotoEnhanceHistogramBins + bytes[index + 2]]++;
            }
        }

        for (let i = 0; i < totalSegments; i++) {
            if (clipLimit > 0) {
                let clipped = 0;
                for (let j = 0; j < PGPhotoEnhanceHistogramBins; j++) {
                    if (hist[i * PGPhotoEnhanceHistogramBins + j] > clipLimit) {
                        clipped += hist[i * PGPhotoEnhanceHistogramBins + j] - clipLimit;
                        hist[i * PGPhotoEnhanceHistogramBins + j] = clipLimit;
                    }
                }

                const redistBatch = Math.floor(clipped / PGPhotoEnhanceHistogramBins);
                const residual = clipped - redistBatch * PGPhotoEnhanceHistogramBins;

                for (let j = 0; j < PGPhotoEnhanceHistogramBins; j++) {
                    hist[i * PGPhotoEnhanceHistogramBins + j] += redistBatch;
                    if (j < residual) {
                        hist[i * PGPhotoEnhanceHistogramBins + j]++;
                    }
                }
            }

            cdfs.set(hist.subarray(i * PGPhotoEnhanceHistogramBins, (i + 1) * PGPhotoEnhanceHistogramBins), i * PGPhotoEnhanceHistogramBins);

            let hMin = PGPhotoEnhanceHistogramBins - 1;
            for (let j = 0; j < hMin; j++) {
                if (cdfs[i * PGPhotoEnhanceHistogramBins + j] !== 0) {
                    hMin = j;
                }
            }

            let cdf = 0;
            for (let j = hMin; j < PGPhotoEnhanceHistogramBins; j++) {
                cdf += cdfs[i * PGPhotoEnhanceHistogramBins + j];
                cdfs[i * PGPhotoEnhanceHistogramBins + j] = Math.min(255, cdf * scale);
            }

            cdfsMin[i] = cdfs[i * PGPhotoEnhanceHistogramBins + hMin];
            cdfsMax[i] = cdfs[i * PGPhotoEnhanceHistogramBins + PGPhotoEnhanceHistogramBins - 1];
        }

        for (let j = 0; j < totalSegments; j++) {
            const yOffset: number = j * PGPhotoEnhanceHistogramBins * 4;
            for (let i = 0; i < PGPhotoEnhanceHistogramBins; i++) {
                const index: number = i * 4 + yOffset;
                result[index] = cdfs[j * PGPhotoEnhanceHistogramBins + i];
                result[index + 1] = cdfsMin[j];
                result[index + 2] = cdfsMax[j];
                result[index + 3] = 255;
            }
        }

        return result;
    }

}

export interface FilterSettings {
    brightness: number;  //[-1,1]
    contrast: number;    //[-1,1]
    saturation: number;  //[-1,1]
    warmth: number;      //[-1,1]
    fade: number;        //[0,1]
    grain: number;       //[0,1]
    sharpen: number;     //[0,1]
    vignette: number;    //[0,1]
    shadow: number;      //[-1,1]
    highlight: number;   //[-1,1]
    enhance: number;     //[0,1]
}