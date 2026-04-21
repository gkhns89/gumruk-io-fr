import { useState, useRef, useCallback, useEffect } from "react";

export function useEdgeScroll({
  edgeZoneWidth = 10,
  scrollSpeed = 5,
} = {}) {
  // Callback ref ile element değişince effect yeniden bağlanır
  const [container, setContainer] = useState(null);
  const containerRef = useCallback((el) => setContainer(el), []);

  const animFrameRef = useRef(null);
  const dirRef       = useRef(null);

  const [scrollDirection, setScrollDirection] = useState(null);

  const stopScrolling = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    dirRef.current = null;
    setScrollDirection(null);
  }, []);

  const scrollStep = useCallback(() => {
    if (!container || !dirRef.current) { stopScrolling(); return; }

    const dir   = dirRef.current;
    const atEnd =
      dir === "left"
        ? container.scrollLeft <= 0
        : container.scrollLeft + container.clientWidth >= container.scrollWidth;

    if (atEnd) { stopScrolling(); return; }

    container.scrollLeft += dir === "left" ? -scrollSpeed : scrollSpeed;
    animFrameRef.current = requestAnimationFrame(scrollStep);
  }, [container, scrollSpeed, stopScrolling]);

  const startScrolling = useCallback(
    (direction) => {
      if (!container) return;
      if (container.scrollWidth <= container.clientWidth) return;
      if (dirRef.current === direction && animFrameRef.current) return;

      stopScrolling();
      dirRef.current = direction;
      setScrollDirection(direction);
      animFrameRef.current = requestAnimationFrame(scrollStep);
    },
    [container, stopScrolling, scrollStep]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!container || container.scrollWidth <= container.clientWidth) return;

      const rect   = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      if (mouseX >= 0 && mouseX < edgeZoneWidth) {
        startScrolling("left");
      } else if (mouseX > rect.width - edgeZoneWidth && mouseX <= rect.width) {
        startScrolling("right");
      } else {
        stopScrolling();
      }
    },
    [container, edgeZoneWidth, startScrolling, stopScrolling]
  );

  const handleMouseLeave = useCallback(() => stopScrolling(), [stopScrolling]);

  const handleScroll = useCallback(() => {
    if (!container || !dirRef.current) return;
    const dir   = dirRef.current;
    const atEnd =
      dir === "left"
        ? container.scrollLeft <= 0
        : container.scrollLeft + container.clientWidth >= container.scrollWidth;
    if (atEnd) stopScrolling();
  }, [container, stopScrolling]);

  // container değişince (element DOM'a eklenince/çıkınca) listener'ları yeniden bağla
  useEffect(() => {
    if (!container) return;

    container.addEventListener("mousemove",  handleMouseMove,  { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("scroll",     handleScroll,     { passive: true });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener("mousemove",  handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("scroll",     handleScroll);
    };
  }, [container, handleMouseMove, handleMouseLeave, handleScroll]);

  return { containerRef, scrollDirection };
}
