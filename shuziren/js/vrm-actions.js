/**
 * VRM数字人动作模块
 * 包含所有动作函数：挥手、敬礼、鞠躬等
 */

// 全局变量（需要与核心模块共享）
const ARM_DOWN_ANGLE = 1.3;   // 手臂自然下垂角度

// 动作速度配置
const ACTION_SPEED = {
    stepDelay: 80,    // 步骤间隔
    waveInterval: 60, // 挥手间隔
    nodInterval: 60,  // 点头间隔
    holdTime: 800     // 动作保持时间
};

// ========== 工具函数 ==========
// 重置所有骨骼到初始状态
window.resetBones = function() {
    if (!window.vrmModel || !window.vrmModel.humanoid) {
        console.log('等待模型加载...');
        return;
    }
    
    // 头部
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    if (head) head.rotation.set(0, 0, 0);
    
    // 手臂 - 自然下垂
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftArm = window.vrmModel.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const leftForearm = window.vrmModel.humanoid.getNormalizedBoneNode('leftLowerArm');
    
    if (rightArm) rightArm.rotation.set(0, 0, ARM_DOWN_ANGLE);
    if (leftArm) leftArm.rotation.set(0, 0, -ARM_DOWN_ANGLE);
    if (rightForearm) rightForearm.rotation.set(0, 0, 0.1);
    if (leftForearm) leftForearm.rotation.set(0, 0, -0.1);
    
    // 脊椎
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    if (spine) spine.rotation.set(0, 0, 0);
    
    // 重置位置
    if (window.vrmModel.scene) {
        window.vrmModel.scene.position.y = -0.2;
        window.vrmModel.scene.rotation.y = 0;
    }
};

// 平滑插值函数
function smoothLerp(start, end, factor) {
    return start + (end - start) * factor;
}

// ========== 1. 指向地图动作 ==========
window.greet = function() {
    window.resetBones();
    
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    
    let step = 0;
    
    function raiseArm() {
        if (rightArm) {
            rightArm.rotation.x = -0.2;
            rightArm.rotation.z = 0.3;
        }
        if (rightForearm) {
            rightForearm.rotation.x = -1.2;
            rightForearm.rotation.y = 0.1;
        }
        if (rightHand) {
            rightHand.rotation.x = 0.2;
            rightHand.rotation.y = -0.1;
        }
        if (head) head.rotation.x = 0.1;
        if (spine) spine.rotation.z = 0.05;
        
        step = 1;
        window.actionTimer = setTimeout(pauseAndLower, 100);
    }
    
    function pauseAndLower() {
        if (step === 1) {
            step = 2;
            window.actionTimer = setTimeout(lowerArm, ACTION_SPEED.holdTime);
        }
    }
    
    function lowerArm() {
        if (step === 2) {
            window.resetBones();
            clearTimeout(window.actionTimer);
            window.currentAction = null;
        }
    }
    
    raiseArm();
};

// ========== 2. 挥手动作 ==========
window.waveHand = function() {
    window.resetBones();
    
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    
    let waveStep = 0;
    let phase = 0;
    
    if (rightArm) {
        rightArm.rotation.x = -0.2;
        rightArm.rotation.z = 0.3;
    }
    if (rightForearm) {
        rightForearm.rotation.x = -1.2;
        rightForearm.rotation.y = 0.1;
    }
    if (rightHand) {
        rightHand.rotation.x = 0.2;
        rightHand.rotation.y = -0.1;
    }
    if (head) head.rotation.x = 0.1;
    if (spine) spine.rotation.z = 0.05;
    
    window.actionTimer = setInterval(() => {
        if (!rightForearm || !rightArm) return;
        
        if (waveStep < 20) {
            const swingAmount = Math.sin(phase * 0.8) * 0.7;
            rightForearm.rotation.y = smoothLerp(rightForearm.rotation.y, 1 + swingAmount, 0.3);
            rightForearm.rotation.x = -1.2;
            
            if (rightHand) {
                rightHand.rotation.y = smoothLerp(rightHand.rotation.y, -0.1 + swingAmount * 0.5, 0.3);
            }
            if (head) {
                head.rotation.x = smoothLerp(head.rotation.x, 0.1 + Math.sin(phase * 0.8) * 0.05, 0.3);
                head.rotation.y = smoothLerp(head.rotation.y, Math.sin(phase * 0.8) * 0.1, 0.3);
            }
            
            phase += 0.8;
            waveStep++;
        } else {
            if (head) {
                head.rotation.x *= 0.9;
                head.rotation.y *= 0.9;
            }
            if (spine) spine.rotation.z *= 0.9;
            
            if (rightArm.rotation.z > ARM_DOWN_ANGLE) {
                rightArm.rotation.z += 0.08;
                rightArm.rotation.x *= 0.9;
                rightForearm.rotation.x += 0.15;
                rightForearm.rotation.y *= 0.9;
                
                if (rightHand) {
                    rightHand.rotation.x *= 0.9;
                    rightHand.rotation.y *= 0.9;
                }
            } else {
                window.resetBones();
                clearInterval(window.actionTimer);
                window.currentAction = null;
            }
        }
    }, ACTION_SPEED.waveInterval);
};


// ========== 4. 点头动作 ==========
window.nodHead = function() {
    window.resetBones();
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    let nodCount = 0;
    
    window.actionTimer = setInterval(() => {
        if (!head) return;
        
        if (nodCount < 3) {
            const t = Date.now() * 0.008;
            head.rotation.x = Math.sin(t) * 0.4;
            nodCount++;
        } else {
            if (Math.abs(head.rotation.x) > 0.01) {
                head.rotation.x *= 0.9;
            } else {
                head.rotation.x = 0;
                clearInterval(window.actionTimer);
                window.currentAction = null;
            }
        }
    }, ACTION_SPEED.nodInterval);
};

// ========== 5. 叉腰动作 ==========
window.handsOnHips = function() {
    window.resetBones();
    
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftArm = window.vrmModel.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const leftForearm = window.vrmModel.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const leftHand = window.vrmModel.humanoid.getNormalizedBoneNode('leftHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const chest = window.vrmModel.humanoid.getNormalizedBoneNode('chest');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    
    let step = 0;
    
    function doNextStep() {
        if (!window.vrmModel) {
            window.currentAction = null;
            return;
        }
        
        switch(step) {
            case 0:
                if (rightArm) rightArm.rotation.z = 0.5;
                if (leftArm) leftArm.rotation.z = -0.5;
                step = 1;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 1:
                if (rightArm) rightArm.rotation.z = 0.5;
                if (leftArm) leftArm.rotation.z = -0.5;
                step = 2;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 2:
                if (rightArm) rightArm.rotation.z = 0.6;
                if (leftArm) leftArm.rotation.z = -0.6;
                if (rightForearm) rightForearm.rotation.z = 0.5;
                if (leftForearm) leftForearm.rotation.z = -0.5;
                step = 3;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 3:
                if (rightArm) rightArm.rotation.z = 0.7;
                if (leftArm) leftArm.rotation.z = -0.7;
                if (rightForearm) rightForearm.rotation.z = 1.2;
                if (leftForearm) leftForearm.rotation.z = -1.2;
                if (rightHand) rightHand.rotation.x = 0.2;
                if (leftHand) leftHand.rotation.x = 0.2;
                step = 4;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 4:
                if (rightArm) rightArm.rotation.z = 0.8;
                if (leftArm) leftArm.rotation.z = -0.8;
                if (rightForearm) rightForearm.rotation.z = 1.5;
                if (leftForearm) leftForearm.rotation.z = -1.5;
                if (spine) spine.rotation.z = 0.03;
                if (chest) chest.rotation.z = 0.02;
                if (head) head.rotation.x = 0.05;
                step = 5;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.holdTime);
                break;
            case 5:
                if (rightForearm) rightForearm.rotation.z = 0.3;
                if (leftForearm) leftForearm.rotation.z = -0.3;
                if (rightArm) rightArm.rotation.z = 0.9;
                if (leftArm) leftArm.rotation.z = -0.9;
                if (rightHand) rightHand.rotation.x = 0.1;
                if (leftHand) leftHand.rotation.x = 0.1;
                if (spine) spine.rotation.z = 0.01;
                if (chest) chest.rotation.z = 0.01;
                step = 6;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 6:
                if (rightForearm) rightForearm.rotation.z = 0.1;
                if (leftForearm) leftForearm.rotation.z = -0.1;
                if (rightArm) rightArm.rotation.z = 0.9;
                if (leftArm) leftArm.rotation.z = -0.8;
                if (rightHand) rightHand.rotation.x = 0;
                if (leftHand) leftHand.rotation.x = 0;
                step = 7;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 7:
                if (rightForearm) rightForearm.rotation.z = 0;
                if (leftForearm) leftForearm.rotation.z = 0;
                if (rightArm) rightArm.rotation.z = 0.9;
                if (leftArm) leftArm.rotation.z = -0.9;
                step = 8;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 8:
                if (rightArm) rightArm.rotation.z = 1;
                if (leftArm) leftArm.rotation.z = -1;
                step = 9;
                window.actionTimer = setTimeout(doNextStep, ACTION_SPEED.stepDelay);
                break;
            case 9:
                window.resetBones();
                if (head) head.rotation.x = 0;
                clearTimeout(window.actionTimer);
                window.currentAction = null;
                break;
        }
    }
    
    step = 0;
    doNextStep();
};

// ========== 7. 敬礼动作 ==========
window.salute = function() {
    window.resetBones();
    
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const chest = window.vrmModel.humanoid.getNormalizedBoneNode('chest');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    
    let salutePhase = 0;
    
    function doSalute() {
        if (!window.vrmModel) {
            window.currentAction = null;
            return;
        }
        
        switch(salutePhase) {
            case 0:
                if (spine) spine.rotation.x = -0.05;
                if (chest) chest.rotation.x = -0.03;
                if (head) head.rotation.x = -0.05;
                salutePhase = 1;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 1:
                if (rightArm) {
                    rightArm.rotation.x = -0.2;
                    rightArm.rotation.z = 0.3;
                }
                if (rightForearm) {
                    rightForearm.rotation.x = -1.2;
                    rightForearm.rotation.y = 0.1;
                }
                salutePhase = 2;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 2:
                if (rightArm) {
                    rightArm.rotation.x = -0.2;
                    rightArm.rotation.z = 0.1;
                }
                if (rightForearm) {
                    rightForearm.rotation.x = -1.5;
                    rightForearm.rotation.y = 2.3;
                }
                if (rightHand) {
                    rightHand.rotation.x = -2;
                    rightHand.rotation.y = 0;
                    rightHand.rotation.z = 0.1;
                }
                if (head) {
                    head.rotation.x = -0.08;
                    head.rotation.y = 0.05;
                }
                salutePhase = 3;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.holdTime);
                break;
            case 3:
                if (rightArm) {
                    rightArm.rotation.x *= 0.8;
                    rightArm.rotation.z *= 0.8;
                    rightArm.rotation.y *= 0.8;
                }
                if (rightForearm) {
                    rightForearm.rotation.x *= 0.8;
                    rightForearm.rotation.y *= 0.8;
                    rightForearm.rotation.z *= 0.8;
                }
                if (rightHand) {
                    rightHand.rotation.x *= 0.8;
                    rightHand.rotation.y *= 0.8;
                    rightHand.rotation.z *= 0.8;
                }
                if (head) {
                    head.rotation.x *= 0.8;
                    head.rotation.y *= 0.8;
                }
                salutePhase = 4;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 4:
                if (rightArm) {
                    rightArm.rotation.x *= 0.7;
                    rightArm.rotation.z *= 0.7;
                    rightArm.rotation.y *= 0.7;
                }
                if (rightForearm) {
                    rightForearm.rotation.x *= 0.7;
                    rightForearm.rotation.y *= 0.7;
                    rightForearm.rotation.z *= 0.7;
                }
                salutePhase = 5;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 5:
                if (rightArm) {
                    rightArm.rotation.x = 0;
                    rightArm.rotation.z = ARM_DOWN_ANGLE;
                    rightArm.rotation.y = 0;
                }
                if (rightForearm) {
                    rightForearm.rotation.x = 0;
                    rightForearm.rotation.y = 0;
                    rightForearm.rotation.z = 0.1;
                }
                if (rightHand) {
                    rightHand.rotation.x = 0;
                    rightHand.rotation.y = 0;
                    rightHand.rotation.z = 0;
                }
                salutePhase = 6;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 6:
                if (spine) spine.rotation.x = 0;
                if (chest) chest.rotation.x = 0;
                if (head) head.rotation.x = 0;
                if (head) head.rotation.y = 0;
                salutePhase = 7;
                window.actionTimer = setTimeout(doSalute, ACTION_SPEED.stepDelay);
                break;
            case 7:
                window.resetBones();
                clearTimeout(window.actionTimer);
                window.currentAction = null;
                break;
        }
    }
    
    salutePhase = 0;
    doSalute();
};