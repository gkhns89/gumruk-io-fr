import { useRef, useState, useEffect, useCallback } from "react";

export function useEdgeScroll({
  edgeZoneWidth = 10,
  scrollSpeed = 5,
} = {}) {
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const dirRef       = useRef(null); // track direction without state

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
    const container = containerRef.current;
    if (!container || !dirRef.current) { stopScrolling(); return; }

    const dir = dirRef.current;
    const atEnd =
      dir === "left"
        ? container.scrollLeft <= 0
        : container.scrollLeft + container.clientWidth >= container.scrollWidth;

    if (atEnd) { stopScrolling(); return; }

    container.scrollLeft += dir === "left" ? -scrollSpeed : scrollSpeed;
    animFrameRef.current = requestAnimationFrame(scrollStep);
  }, [scrollSpeed, stopScrolling]);

  const startScrolling = useCallback(
    (direction) => {
      const container = containerRef.current;
      if (!container) return;

      const alreadyScrollable = container.scrollWidth > container.clientWidth;
      if (!alreadyScrollable) return;

      if (dirRef.current === direction && animFrameRef.current) return;

      stopScrolling();
      dirRef.current = direction;
      setScrollDirection(direction);
      animFrameRef.current = requestAnimationFrame(scrollStep);
    },
    [stopScrolling, scrollStep]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const container = containerRef.current;
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
    [edgeZoneWidth, startScrolling, stopScrolling]
  );

  const handleMouseLeave = useCallback(() => stopScrolling(), [stopScrolling]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !dirRef.current) return;
    const dir = dirRef.current;
    const atEnd =
      dir === "left"
        ? container.scrollLeft <= 0
        : container.scrollLeft + container.clientWidth >= container.scrollWidth;
    if (atEnd) stopScrolling();
  }, [stopScrolling]);

  useEffect(() => {
    const container = containerRef.current;
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
  }, [handleMouseMove, handleMouseLeave, handleScroll]);

  return { containerRef, scrollDirection };
}
