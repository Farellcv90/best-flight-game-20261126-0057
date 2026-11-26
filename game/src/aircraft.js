// Langit Nusantara — the courier plane. Built entirely from Three.js
// primitives with a bright courier livery: orange fuselage, cream wings,
// blue tail, a spinning propeller and fixed landing gear. The mesh is a
// Group so the flight model can pitch, roll and yaw it as one object.
import * as THREE from 'three';
import { COLOURS } from './config.js';

/** Build the plane and return { group, propeller } for animation. */
export function buildAircraft() {
  const group = new THREE.Group();
  group.name = 'courier-plane';

  const bodyMat = new THREE.MeshLambertMaterial({ color: COLOURS.planeBody });
  const wingMat = new THREE.MeshLambertMaterial({ color: COLOURS.planeWing });
  const tailMat = new THREE.MeshLambertMaterial({ color: COLOURS.planeTail });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ef });

  // Fuselage: a tapered cylinder pointing forward (-z is forward here).
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 7.5, 12), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.name = 'fuselage';
  group.add(fuselage);

  // Nose cone and cockpit canopy.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 12), bodyMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.5;
  group.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), glassMat);
  canopy.scale.set(1, 0.75, 1.6);
  canopy.position.set(0, 0.85, -1.2);
  group.add(canopy);

  // Main wings: one wide box with rounded tips via a second thin box.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13, 0.28, 2.4), wingMat);
  wing.position.set(0, -0.15, -0.4);
  wing.name = 'main-wing';
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.2), tailMat);
  wingTipL.position.set(-6.6, -0.15, -0.4);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 6.6;
  group.add(wingTipR);

  // Tail: horizontal stabiliser and vertical fin.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), wingMat);
  stabiliser.position.set(0, 0.25, 3.4);
  group.add(stabiliser);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 1.8), tailMat);
  fin.position.set(0, 1.1, 3.4);
  group.add(fin);

  // Propeller: hub + two blades, spun by the render loop.
  const propeller = new THREE.Group();
  propeller.name = 'propeller';
  propeller.position.set(0, 0, -5.4);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), darkMat);
  propeller.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.35, 3.4, 0.12);
  const bladeA = new THREE.Mesh(bladeGeo, darkMat);
  propeller.add(bladeA);
  const bladeB = new THREE.Mesh(bladeGeo, darkMat);
  bladeB.rotation.z = Math.PI / 2;
  propeller.add(bladeB);
  group.add(propeller);

  // Landing gear: two wheels and a tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const strutGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(strutGeo, darkMat);
    strut.position.set(side * 1.4, -1.2, -0.6);
    group.add(strut);
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(side * 1.4, -2.0, -0.6);
    group.add(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 10), darkMat);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -1.5, 3.2);
  group.add(tailWheel);

  // Courier stripe along the fuselage.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 5.4), tailMat);
  stripe.position.set(0, 0.1, 0.4);
  group.add(stripe);

  // Navigation lights: red on the left wingtip, green on the right.
  const navLightGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const navLeft = new THREE.Mesh(navLightGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  navLeft.position.set(-6.85, -0.15, -0.4);
  group.add(navLeft);
  const navRight = new THREE.Mesh(navLightGeo, new THREE.MeshBasicMaterial({ color: 0x2aff66 }));
  navRight.position.set(6.85, -0.15, -0.4);
  group.add(navRight);

  return { group, propeller };
}

/** Spin the propeller faster with throttle; idle spin on the ground. */
export function spinPropeller(propeller, throttle, dt) {
  const rate = 4 + throttle * 42;
  propeller.rotation.z += rate * dt;
}
