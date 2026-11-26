// The aircraft: a coral-orange prop plane built from primitives, "Kitefin".
// One clear job: the visible plane — fuselage, wings, propeller, nav lights.

export function buildPlane() {
  const plane = new THREE.Group();
  const orange = new THREE.MeshLambertMaterial({ color: 0xe8642a });
  const cream = new THREE.MeshLambertMaterial({ color: 0xfff3d6 });
  const teal = new THREE.MeshLambertMaterial({ color: 0x0e7c86 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2f33 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 140, specular: 0xffffff });

  // Fuselage: tapered nose cone + main tube + tail cone, nose toward +Z.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.85, 5.6, 12), orange);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.4;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 12), orange);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 3.5;
  plane.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.4, 12), orange);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -4.3;
  plane.add(tail);

  // Canopy: a glass bubble on top, lit from inside by a warm instrument glow.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), glass);
  canopy.scale.set(0.85, 0.62, 1.7);
  canopy.position.set(0, 1.05, 1.1);
  plane.add(canopy);
  const panelGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.5, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffc46b }),
  );
  panelGlow.position.set(0, 0.72, 2.05);
  plane.add(panelGlow);

  // Main wings + tailplane + fin.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.28, 2.4), cream);
  wing.position.set(0, 0.15, 0.6);
  plane.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 2.4), teal);
  wingTipL.position.set(-7.9, 0.15, 0.6);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 7.9;
  plane.add(wingTipR);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.5), cream);
  tailplane.position.set(0, 0.35, -4.6);
  plane.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.6, 1.9), teal);
  fin.position.set(0, 1.25, -4.7);
  plane.add(fin);

  // Propeller: hub + two blades, spins around the nose axis.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 10), dark);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.45;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.34, 4.6, 0.12);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  prop.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade2);
  prop.position.z = 4.8;
  plane.add(prop);
  plane.userData.prop = prop;

  // Landing gear: two wheels + tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), dark);
    strut.position.set(side * 1.6, -1.1, 0.9);
    plane.add(strut);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.6, -1.85, 0.9);
    plane.add(wheel);
  }

  // Nav lights: red port, green starboard, white tail — always lit.
  const lightGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const port = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  port.position.set(-7.9, 0.2, 0.6);
  plane.add(port);
  const starboard = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x2aff66 }));
  starboard.position.set(7.9, 0.2, 0.6);
  plane.add(starboard);
  const tailLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.5, -5.5);
  plane.add(tailLight);

  return plane;
}

// Spin the propeller: faster with speed, idling on the ground.
export function spinPropeller(plane, speed, dt) {
  const prop = plane.userData.prop;
  prop.rotation.z += dt * (2 + speed * 0.55);
}
