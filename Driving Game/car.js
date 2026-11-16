// ---------- Detailed Procedural Car Model with Custom Paint Support ----------
function buildCar(customColor){
  const car = new THREE.Group();
  const color = customColor || 0xe63946;

  // Main Chassis / Lower Body
  const mainMat = new THREE.MeshLambertMaterial({color: color});
  const bodyGeo = new THREE.BoxGeometry(2.0, 0.5, 4.2);
  const body = new THREE.Mesh(bodyGeo, mainMat);
  body.position.y = 0.55;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.isBody = true; // Tag for dynamic paint updates
  car.add(body);

  // Front Bumper / Air Dam
  const bumperMat = new THREE.MeshLambertMaterial({color: 0x222222});
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 0.3), bumperMat);
  frontBumper.position.set(0, 0.38, 2.0);
  car.add(frontBumper);

  // Side Skirts
  const skirtGeo = new THREE.BoxGeometry(0.1, 0.2, 3.2);
  const leftSkirt = new THREE.Mesh(skirtGeo, bumperMat);
  leftSkirt.position.set(1.0, 0.35, 0);
  car.add(leftSkirt);
  const rightSkirt = new THREE.Mesh(skirtGeo, bumperMat);
  rightSkirt.position.set(-1.0, 0.35, 0);
  car.add(rightSkirt);

  // Upper Cabin / Roof
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.2);
  const cabin = new THREE.Mesh(cabinGeo, mainMat);
  cabin.position.set(0, 1.05, -0.2);
  cabin.castShadow = true;
  cabin.userData.isCabin = true;
  car.add(cabin);

  // Interior Cockpit (Seats & Steering Wheel)
  const interiorMat = new THREE.MeshLambertMaterial({color: 0x111111});
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), interiorMat);
  driverSeat.position.set(-0.35, 0.85, -0.2);
  car.add(driverSeat);
  const passengerSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), interiorMat);
  passengerSeat.position.set(0.35, 0.85, -0.2);
  car.add(passengerSeat);

  const steeringWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), interiorMat);
  steeringWheel.rotation.x = Math.PI / 3;
  steeringWheel.position.set(-0.35, 1.05, 0.3);
  car.add(steeringWheel);

  // Windshield & Rear Window (Dark glass)
  const glassMat = new THREE.MeshLambertMaterial({color: 0x112233, transparent: true, opacity: 0.8});
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.2), glassMat);
  windshield.position.set(0, 1.05, 0.75);
  windshield.rotation.x = 0.45;
  car.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.0), glassMat);
  rearWindow.position.set(0, 1.05, -1.1);
  rearWindow.rotation.x = -0.45;
  car.add(rearWindow);

  // Side Mirrors
  const mirrorMat = new THREE.MeshLambertMaterial({color: 0x111111});
  const leftMirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), mirrorMat);
  leftMirror.position.set(1.1, 0.9, 0.6);
  car.add(leftMirror);
  const rightMirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), mirrorMat);
  rightMirror.position.set(-1.1, 0.9, 0.6);
  car.add(rightMirror);

  // Headlights & Taillights
  const headlightMat = new THREE.MeshBasicMaterial({color: 0xffffdd});
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMat);
  hlLeft.position.set(0.7, 0.6, 2.15);
  car.add(hlLeft);
  const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMat);
  hlRight.position.set(-0.7, 0.6, 2.15);
  car.add(hlRight);

  const taillightMat = new THREE.MeshBasicMaterial({color: 0xff1100});
  const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), taillightMat);
  tlLeft.position.set(0.7, 0.6, -2.15);
  car.add(tlLeft);
  const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), taillightMat);
  tlRight.position.set(-0.7, 0.6, -2.15);
  car.add(tlRight);

  // Rear Spoiler / Wing
  const spoilerBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), mainMat);
  spoilerBar.position.set(0, 1.35, -1.9);
  spoilerBar.castShadow = true;
  car.add(spoilerBar);
  const spoilerPostL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), mirrorMat);
  spoilerPostL.position.set(0.7, 1.2, -1.9);
  car.add(spoilerPostL);
  const spoilerPostR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), mirrorMat);
  spoilerPostR.position.set(-0.7, 1.2, -1.9);
  car.add(spoilerPostR);

  // Dual Chrome Exhaust Pipes
  const exhaustMat = new THREE.MeshLambertMaterial({color: 0xdddddd});
  const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), exhaustMat);
  exL.rotation.x = Math.PI/2;
  exL.position.set(0.5, 0.35, -2.15);
  car.add(exL);
  const exR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), exhaustMat);
  exR.rotation.x = Math.PI/2;
  exR.position.set(-0.5, 0.35, -2.15);
  car.add(exR);

  // Wheels with Detailed Spoke Rims
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 16);
  const tireMat = new THREE.MeshLambertMaterial({color: 0x1a1a1a});
  const rimMat = new THREE.MeshLambertMaterial({color: 0xcccccc});
  const wheels = [];

  for(const [x,z] of [[-1.1, 1.4], [1.1, 1.4], [-1.1, -1.4], [1.1, -1.4]]){
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI/2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 6), rimMat);
    rim.rotation.z = Math.PI/2;
    wheelGroup.add(rim);

    wheelGroup.position.set(x, 0.38, z);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  }

  return {group: car, wheels: wheels};
}