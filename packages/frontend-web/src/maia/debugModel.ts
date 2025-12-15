/**
 * Maia Model Debug Utility
 * 
 * Run in browser console to inspect the ONNX model:
 * 
 * import { inspectModel } from './maia/debugModel';
 * inspectModel(1500);
 */

import * as ort from 'onnxruntime-web';

export async function inspectModel(rating: number): Promise<void> {
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`  Inspecting Maia-${rating} ONNX Model`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  try {
    const modelPath = `/models/maia-${rating}.onnx`;
    console.log(`Loading ${modelPath}...`);
    
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
    });

    console.log(`\n📥 INPUTS:`);
    for (const name of session.inputNames) {
      console.log(`  - ${name}`);
    }

    console.log(`\n📤 OUTPUTS:`);
    for (const name of session.outputNames) {
      console.log(`  - ${name}`);
    }

    // Try a sample inference
    console.log(`\n🧪 Testing inference with random input...`);
    
    // Create random input tensor [1, 112, 8, 8]
    const inputData = new Float32Array(112 * 8 * 8).fill(0);
    inputData[0] = 1; // Just set one value to test
    
    const inputTensor = new ort.Tensor('float32', inputData, [1, 112, 8, 8]);
    
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;
    
    const startTime = performance.now();
    const results = await session.run(feeds);
    const elapsed = performance.now() - startTime;
    
    console.log(`\n✅ Inference completed in ${elapsed.toFixed(0)}ms`);
    
    for (const [name, tensor] of Object.entries(results)) {
      const data = tensor.data as Float32Array;
      console.log(`  ${name}: shape=[${tensor.dims?.join(', ')}], size=${data.length}`);
      
      // Show first few values
      const preview = Array.from(data.slice(0, 5)).map(v => v.toFixed(4));
      console.log(`    First 5 values: [${preview.join(', ')}...]`);
      
      // Show stats
      const max = Math.max(...data);
      const min = Math.min(...data);
      const sum = data.reduce((a, b) => a + b, 0);
      console.log(`    Min: ${min.toFixed(4)}, Max: ${max.toFixed(4)}, Sum: ${sum.toFixed(4)}`);
    }

    await session.release();
    console.log(`\n═══════════════════════════════════════════════════════════════`);

  } catch (error) {
    console.error('Failed to inspect model:', error);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).inspectMaiaModel = inspectModel;
  console.log('Run window.inspectMaiaModel(1500) to inspect the model');
}
