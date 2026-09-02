import * as THREE from "three";
import { makeSpeechBubble } from "./canvasFx.js";

/** Movie-style Agent Smith: black suit, white shirt, black tie, earpiece, aviators. */
class AgentSmith {
  constructor(scene) {
    this.x = 7;
    this.z = 42.2;
    this.walkPhase = 0;
    this.fadeMaterials = [];
    this.group = new THREE.Group();
    this.group.visible = false;
    var g = this.group;
    var reg = (function (self) {
      return function (mat, base) {
        mat.transparent = true;
        mat.userData.baseOp = base != null ? base : mat.opacity;
        self.fadeMaterials.push(mat);
        return mat;
      };
    })(this);

    var skin = reg(new THREE.MeshBasicMaterial({ color: 0xcab9a8, opacity: 0.98 }));
    var suit = reg(new THREE.MeshBasicMaterial({ color: 0x0f0f0f, opacity: 0.98 }));
    var suitDark = reg(new THREE.MeshBasicMaterial({ color: 0x050505, opacity: 0.99 }));
    var shirt = reg(new THREE.MeshBasicMaterial({ color: 0xeaece8, opacity: 0.96 }));
    var tieBlk = reg(new THREE.MeshBasicMaterial({ color: 0x080808, opacity: 0.99 }));
    var lens = reg(new THREE.MeshBasicMaterial({ color: 0x020202, opacity: 0.98 }));
    var frame = reg(new THREE.MeshBasicMaterial({ color: 0x050505, opacity: 0.98 }));
    var silver = reg(new THREE.MeshBasicMaterial({ color: 0xc5ccd4, opacity: 0.95 }));
    var leather = reg(new THREE.MeshBasicMaterial({ color: 0x1a1a1c, opacity: 0.96 }));

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin);
    head.position.set(0, 1.73, 0);
    g.add(head);
    var hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48),
      suitDark
    );
    hair.position.set(0, 1.8, -0.03);
    g.add(hair);

    var rimGeo = new THREE.TorusGeometry(0.076, 0.014, 6, 16);
    var rim = new THREE.Mesh(rimGeo, frame);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(-0.085, 1.74, 0.155);
    g.add(rim);
    var rim2 = new THREE.Mesh(rimGeo, frame);
    rim2.rotation.x = Math.PI / 2;
    rim2.position.set(0.085, 1.74, 0.155);
    g.add(rim2);
    var lensL = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), lens);
    lensL.position.set(-0.085, 1.74, 0.168);
    g.add(lensL);
    var lensR = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), lens);
    lensR.position.set(0.085, 1.74, 0.168);
    g.add(lensR);
    var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.04), frame);
    bridge.position.set(0, 1.735, 0.16);
    g.add(bridge);
    var templeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.018), frame);
    templeL.position.set(-0.19, 1.74, 0.08);
    g.add(templeL);
    var templeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.018), frame);
    templeR.position.set(0.19, 1.74, 0.08);
    g.add(templeR);

    var earPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 8), silver);
    earPlug.rotation.z = Math.PI / 2;
    earPlug.position.set(-0.2, 1.7, 0.02);
    g.add(earPlug);
    var wire = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.009, 4, 12, Math.PI * 1.2), silver);
    wire.position.set(-0.22, 1.55, -0.02);
    wire.rotation.y = Math.PI / 2;
    g.add(wire);

    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.24), suit);
    torso.position.set(0, 1.32, 0);
    g.add(torso);
    var lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.02), suitDark);
    lapelL.position.set(-0.16, 1.28, 0.125);
    lapelL.rotation.z = 0.1;
    g.add(lapelL);
    var lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.02), suitDark);
    lapelR.position.set(0.16, 1.28, 0.125);
    lapelR.rotation.z = -0.1;
    g.add(lapelR);
    var shirtV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.02), shirt);
    shirtV.position.set(0, 1.26, 0.126);
    g.add(shirtV);
    var tieK = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.03), tieBlk);
    tieK.position.set(0, 1.45, 0.135);
    g.add(tieK);
    var tieB = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.025), tieBlk);
    tieB.position.set(0, 1.18, 0.135);
    g.add(tieB);
    var hips = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.22), suit);
    hips.position.set(0, 0.9, 0);
    g.add(hips);
    var belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.23), suitDark);
    belt.position.set(0, 0.82, 0);
    g.add(belt);
    var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.03), silver);
    buckle.position.set(0, 0.82, 0.125);
    g.add(buckle);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.3, 1.38, 0);
    var lau = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), suit);
    lau.position.set(0, -0.14, 0);
    this.leftArmPivot.add(lau);
    var laf = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.28, 8), suit);
    laf.position.set(-0.015, -0.44, 0.02);
    this.leftArmPivot.add(laf);
    g.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.3, 1.38, 0);
    var rau = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), suit);
    rau.position.set(0, -0.14, 0);
    this.rightArmPivot.add(rau);
    var raf = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.28, 8), suit);
    raf.position.set(0.015, -0.44, 0.02);
    this.rightArmPivot.add(raf);
    this.gunGroup = new THREE.Group();
    this.gunGroup.position.set(0.02, -0.52, 0.08);
    var pg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.18), suitDark);
    this.gunGroup.add(pg);
    var pb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 6), silver);
    pb.rotation.x = Math.PI / 2;
    pb.position.set(0, 0.02, 0.12);
    this.gunGroup.add(pb);
    this.rightArmPivot.add(this.gunGroup);
    g.add(this.rightArmPivot);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.13, 0.68, 0);
    var ll1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), suit);
    ll1.position.set(0, -0.2, 0);
    this.leftLegPivot.add(ll1);
    var ll2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 8), suit);
    ll2.position.set(0, -0.52, 0.02);
    this.leftLegPivot.add(ll2);
    var shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), leather);
    shoeL.position.set(0, -0.72, 0.04);
    this.leftLegPivot.add(shoeL);
    g.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.13, 0.68, 0);
    var rl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), suit);
    rl1.position.set(0, -0.2, 0);
    this.rightLegPivot.add(rl1);
    var rl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 8), suit);
    rl2.position.set(0, -0.52, 0.02);
    this.rightLegPivot.add(rl2);
    var shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), leather);
    shoeR.position.set(0, -0.72, 0.04);
    this.rightLegPivot.add(shoeR);
    g.add(this.rightLegPivot);

    this.bubble = makeSpeechBubble();
    this.bubble.sprite.position.set(0, 2.55, 0);
    this.bubble.sprite.scale.set(3.5, 1.2, 1);
    g.add(this.bubble.sprite);

    scene.add(this.group);
    this.syncGroup();
  }

  syncGroup() {
    this.group.position.set(this.x, 0, this.z);
  }

  applyFadeMultiplier(mult) {
    for (var i = 0; i < this.fadeMaterials.length; i++) {
      var m = this.fadeMaterials[i];
      var b = m.userData.baseOp != null ? m.userData.baseOp : 0.95;
      m.opacity = Math.max(0, b * mult);
    }
  }
}

export { AgentSmith };
