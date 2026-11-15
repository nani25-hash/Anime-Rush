import * as THREE from 'three';

export interface WorldCurveUniforms {
  uCurveX: { value: number };
  uCurveY: { value: number };
}

export function createWorldCurveUniforms(): WorldCurveUniforms {
  return {
    uCurveX: { value: 0 },
    uCurveY: { value: 0 },
  };
}

export function applyWorldCurveShader(
  material: THREE.Material,
  uniforms: WorldCurveUniforms,
): void {
  material.customProgramCacheKey = () => 'anime-rush-world-curve-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCurveX = uniforms.uCurveX;
    shader.uniforms.uCurveY = uniforms.uCurveY;

    shader.vertexShader =
      `uniform float uCurveX;\nuniform float uCurveY;\n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      #include <project_vertex>
      float curveDist = max(0.0, -mvPosition.z - 6.0);
      float curveDistSq = curveDist * curveDist;
      mvPosition.x += uCurveX * curveDistSq;
      mvPosition.y += uCurveY * curveDistSq;
      gl_Position = projectionMatrix * mvPosition;
      `,
    );
  };
}
