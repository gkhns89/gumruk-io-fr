import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";

/**
 * Custom hook for edge-scrolling functionality on horizontally scrollable containers.
 * When mouse hovers near the left/right edges, automatically scrolls in that direction.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.edgeZoneWidth - Width of edge detection zones in pixels (default: 10)
 * @param {number} options.scrollSpeed - Scroll speed in pixels per frame (default: 5)
 * @param {boolean} options.enableOnTouch - Enable on touch devices (default: false)
 * @returns {Object} - { containerRef, scrollDirection } - Ref and current scroll direction
 */
export function useEdgeScroll({
  edgeZoneWidth = 10,
  scrollSpeed = 5,
  enableOnTouch = false,
} = {}) {
  // Refs for DOM element and animation control
  const scrollContainerRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const isScrollingRef = useRef(false);

  // State for scroll direction (to show visual indicator)
  const [scrollDirection, setScrollDirection] = useState(null); // 'left' | 'right' | null
  const [isAttached, setIsAttached] = useState(false); // Track if listeners are attached

  /**
   * Detect if device is desktop (non-touch)
   */
  const isDesktopDevice = useCallback(() => {
    // Check for touch capability
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

    // Check screen width as fallback
    const isWideScreen = window.innerWidth >= 1024;

    return !hasTouch && isWideScreen;
  }, []);

  /**
   * Check if scroll has reached boundaries
   */
  const isAtBoundary = useCallback((direction) => {
    if (!scrollContainerRef.current) return true;

    const container = scrollContainerRef.current;

    if (direction === "left") {
      return container.scrollLeft === 0;
    } else if (direction === "right") {
      return (
        container.scrollLeft + container.clientWidth >= container.scrollWidth
      );
    }

    return false;
  }, []);

  /**
   * Check if container is scrollable
   */
  const isScrollable = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    const container = scrollContainerRef.current;
    return container.scrollWidth > container.clientWidth;
  }, []);

  /**
   * Stop scrolling animation
   */
  const stopScrolling = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    isScrollingRef.current = false;
    setScrollDirection(null);
  }, []);

  /**
   * Perform one scroll step
   */
  const scrollStep = useCallback(() => {
    if (!scrollContainerRef.current) {
      stopScrolling();
      return;
    }

    // Get current direction from ref to avoid stale closure
    const currentDirection = isScrollingRef.current ? scrollContainerRef.current.dataset.scrollDirection : null;

    if (!currentDirection) {
      stopScrolling();
      return;
    }

    // Check if we've reached the boundary
    if (isAtBoundary(currentDirection)) {
      stopScrolling();
      return;
    }

    // Perform scroll
    if (currentDirection === "left") {
      scrollContainerRef.current.scrollLeft -= scrollSpeed;
    } else if (currentDirection === "right") {
      scrollContainerRef.current.scrollLeft += scrollSpeed;
    }

    // Continue animation
    animationFrameIdRef.current = requestAnimationFrame(scrollStep);
  }, [scrollSpeed, isAtBoundary, stopScrolling]);

  /**
   * Start scrolling in the specified direction
   */
  const startScrolling = useCallback(
    (direction) => {
      // Get current direction from dataset
      const currentDir = scrollContainerRef.current?.dataset.scrollDirection;

      // Don't restart if already scrolling in the same direction
      if (isScrollingRef.current && currentDir === direction) {
        return;
      }

      // Stop any existing scroll animation
      stopScrolling();

      // Check if we can scroll in this direction
      if (isAtBoundary(direction)) {
        return;
      }

      // Start new scroll animation
      if (scrollContainerRef.current) {
        scrollContainerRef.current.dataset.scrollDirection = direction;
      }
      setScrollDirection(direction);
      isScrollingRef.current = true;
      animationFrameIdRef.current = requestAnimationFrame(scrollStep);
    },
    [isAtBoundary, stopScrolling, scrollStep]
  );

  /**
   * Handle mouse move event - detect edge zones
   */
  const handleMouseMove = useCallback(
    (e) => {
      if (!scrollContainerRef.current) {
        return;
      }

      const scrollable = isScrollable();
      if (!scrollable) {
        return;
      }

      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();

      // Calculate mouse position relative to container
      const mouseX = e.clientX - rect.left;

      // Check if mouse is in left edge zone
      if (mouseX < edgeZoneWidth && mouseX >= 0) {
        startScrolling("left");
        return;
      }

      // Check if mouse is in right edge zone
      if (mouseX > rect.width - edgeZoneWidth && mouseX <= rect.width) {
        startScrolling("right");
        return;
      }

      // Mouse is not in any edge zone - stop scrolling
      if (isScrollingRef.current) {
        stopScrolling();
      }
    },
    [edgeZoneWidth, isScrollable, startScrolling, stopScrolling]
  );

  /**
   * Handle mouse leave event - stop scrolling when mouse exits container
   */
  const handleMouseLeave = useCallback(() => {
    stopScrolling();
  }, [stopScrolling]);

  /**
   * Handle scroll event - stop if we reach boundary during manual scroll
   */
  const handleScroll = useCallback(() => {
    const currentDirection = scrollContainerRef.current?.dataset.scrollDirection;
    if (
      isScrollingRef.current &&
      currentDirection &&
      isAtBoundary(currentDirection)
    ) {
      stopScrolling();
    }
  }, [isAtBoundary, stopScrolling]);

  /**
   * Attach event listeners when handlers change
   */
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isAttached) {
      return;
    }

    // Add event listeners with passive flag for performance
    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("scroll", handleScroll, { passive: true });

    setIsAttached(true);

    // Cleanup function
    return () => {
      // Cancel any ongoing animation
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      // Remove event listeners
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("scroll", handleScroll);
      setIsAttached(false);
    };
  }, [handleMouseMove, handleMouseLeave, handleScroll, isAttached]);

  /**
   * Callback ref to attach listeners when DOM element is ready
   */
  const setRef = useCallback((node) => {
    // Cleanup previous container
    if (scrollContainerRef.current && isAttached) {
      const prevContainer = scrollContainerRef.current;
      prevContainer.removeEventListener("mousemove", handleMouseMove);
      prevContainer.removeEventListener("mouseleave", handleMouseLeave);
      prevContainer.removeEventListener("scroll", handleScroll);
      setIsAttached(false);
    }

    // Store new ref
    scrollContainerRef.current = node;

    // Attach to new container
    if (node) {
      node.addEventListener("mousemove", handleMouseMove, { passive: true });
      node.addEventListener("mouseleave", handleMouseLeave);
      node.addEventListener("scroll", handleScroll, { passive: true });
      setIsAttached(true);
    }
  }, [handleMouseMove, handleMouseLeave, handleScroll, isAttached]);

  return { containerRef: setRef, scrollDirection };
}
