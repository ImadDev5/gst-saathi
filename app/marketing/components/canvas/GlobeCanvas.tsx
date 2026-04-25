import { useEffect, useRef } from "react";
import * as THREE from "three";

export function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 800, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, 800);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(5, 40, 40);
    const material = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.05,
      opacity: 0.4,
      transparent: true,
    });
    const sphere = new THREE.Points(geometry, material);
    scene.add(sphere);
    camera.position.z = 10;

    const animate = () => {
      requestAnimationFrame(animate);
      sphere.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, 800);
      camera.aspect = window.innerWidth / 800;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} id="globe-canvas" className="opacity-40" />;
}
