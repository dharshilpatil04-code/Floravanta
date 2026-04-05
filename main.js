/* Performance and Device Capability Detection Flags */
const isMobileDevice = window.matchMedia("(max-width: 1024px)").matches || window.matchMedia("(pointer: coarse)").matches;
const isLowPower = isMobileDevice || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
    initLandingAnimation();
    initIntersectionObservers();
    initParallax();
    initVideoScroll();
    initSupportModal();
    initLightbox();
    initForestFauna();
    initAmbientAudio();
});



/* 
 * 4. Cinematic Video Scroll
 * Syncs video playback natively to scroll position with lerp smoothing
 */
function initVideoScroll() {
    const videoSequence = document.getElementById("video-sequence");
    const video = document.getElementById("scroll-video");

    if (!videoSequence || !video) return;

    // Strict Mobile & Tablet Optimization: Completely disable CPU-heavy scroll-scrubbing. Use native autoplay.
    if (isMobileDevice) {
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.setAttribute('playsinline', ''); // Ensuring it works on iOS Safari
        video.play().catch(() => {});
        return;
    }

    let targetTime = 0;
    let currentTime = 0;
    const videoEase = 0.06; // Highly tuned fluid scrubbing tracking

    function renderVideo() {
        const rect = videoSequence.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        let scrollProgress = 0;
        const scrollableDistance = rect.height - viewportHeight;

        // Ensure scrubbing only happens while sticky wrapper is actively pinned
        if (rect.top <= 0 && rect.bottom >= viewportHeight) {
            scrollProgress = Math.abs(rect.top) / scrollableDistance;
        } else if (rect.top > 0) {
            scrollProgress = 0;
        } else if (rect.bottom < viewportHeight) {
            scrollProgress = 1;
        }

        // Entrance tracking removed to favor hardware-GPU CSS crossfade natively.
        // Ensures the main thread focuses entirely on fluid 60fps video seeking instead of DOM repaints.

        // Video frame scrub tracking
        // Only manipulate time if metadata loaded
        if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
            targetTime = scrollProgress * video.duration;
            currentTime += (targetTime - currentTime) * videoEase;
            
            // Lower fidelity mapping on low power devices to avoid CPU choke
            const threshold = isLowPower ? 0.15 : 0.08;
            if (Math.abs(currentTime - video.currentTime) > threshold) {
                video.currentTime = currentTime;
            }
        }

        requestAnimationFrame(renderVideo);
    }
    
    // Trigger initial load and rendering
    video.load();
    renderVideo();
}

/* 
 * 1. Landing Text Animation
 * Splits the text, wraps each char in a span, and applies a staggered fade-in
 */
function initLandingAnimation() {
    const titleElement = document.getElementById("landing-title");
    const taglineElement = document.querySelector(".tagline");
    
    if (titleElement) {
        const text = titleElement.textContent;
        titleElement.textContent = "";

        // Add each character with a separate span and delay
        [...text].forEach((char, index) => {
            const span = document.createElement("span");
            span.textContent = char;
            span.className = "char";
            // Stagger animation based on index
            span.style.transitionDelay = `${index * 0.1}s`;
            
            // Allow empty spaces (though FLORAVANTA is a single word)
            if (char === " ") {
                span.style.width = "0.5em";
            }
            
            titleElement.appendChild(span);

            // trigger visibility almost immediately
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    span.classList.add("visible");
                });
            });
        });
    }

    if (taglineElement) {
        taglineElement.classList.add("visible");
    }

    // Scroll Indicator Logic
    const scrollIndicator = document.getElementById("scroll-indicator");
    if (scrollIndicator) {
        // Show after the title and tagline animations finish (1.5s delay + 2s fadeUp)
        setTimeout(() => {
            if (window.scrollY < 10) {
                scrollIndicator.classList.add("visible");
            }
        }, 3500);

        // Hide smoothly when user scrolls
        window.addEventListener("scroll", () => {
            if (window.scrollY > 20) {
                scrollIndicator.classList.add("hidden-on-scroll");
            } else {
                scrollIndicator.classList.remove("hidden-on-scroll");
            }
        });
    }
}

/* 
 * 2. Intersection Observer for Scroll Setup
 * Detects items entering the view to smoothly fade logic 
 */
function initIntersectionObservers() {
    const animatedElements = document.querySelectorAll('.js-animate, .js-animate-support, .js-animate-support-delayed, .js-gallery-animate, .js-forest-animate-top, .js-forest-animate-bottom');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // trigger when 15% visible
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target); // only animate once
                
                // If it's a gallery item, remove the long transition after it lands to avoid parallax lag
                if (entry.target.classList.contains('js-gallery-animate')) {
                    setTimeout(() => {
                        entry.target.style.transition = 'opacity 0.6s ease'; // Strip out transform transition
                    }, 2600);
                }
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
}

/* 
 * 3. Smooth Parallax and Spotlight Brush Effect
 * Moves gently based on cursor position and reacts to scroll
 */
function initParallax() {
    const section = document.getElementById("parallax-section");
    const wrapper = document.getElementById("hero-wrapper");
    const colorLayer = document.getElementById("hero-color");

    if (!section || !wrapper) return;

    // Parallax logic variables
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const ease = 0.05;

    // Spotlight logic variables
    let spotX = 50;
    let spotY = 50;
    let currentSpotX = 50;
    let currentSpotY = 50;
    const spotEase = 0.055; // Tuned for a fluid wave effect that isn't laggy or rigid

    const landingContent = document.querySelector(".landing-content");

    // Listen to mouse movement over the container
    if (!isMobileDevice && !prefersReducedMotion) {
        section.addEventListener("mousemove", (e) => {
            const rect = section.getBoundingClientRect();
            
            const xPos = (e.clientX - rect.left) / rect.width - 0.5;
            const yPos = (e.clientY - rect.top) / rect.height - 0.5;

            targetX = xPos * 4; 
            targetY = yPos * 4;

            // Mouse relative percentage for spotlight
            spotX = ((e.clientX - rect.left) / rect.width) * 100;
            spotY = ((e.clientY - rect.top) / rect.height) * 100;
            
            if (colorLayer) colorLayer.classList.add("active");
        });

        // Subtly reset when mouse leaves
        section.addEventListener("mouseleave", () => {
            targetX = 0;
            targetY = 0;
            if (colorLayer) colorLayer.classList.remove("active");
        });
    }

    // Handle Scroll for vertical parallax movement
    let scrollY = 0;
    window.addEventListener("scroll", () => {
        scrollY = window.pageYOffset;
        
        // Mobile fallback: reveal color softly when scrolling down
        if (window.matchMedia("(hover: none)").matches) {
            if (scrollY > window.innerHeight * 0.4) {
                if (colorLayer) colorLayer.classList.add("active");
                spotX = 50;
                spotY = 50;
            } else {
                if (colorLayer) colorLayer.classList.remove("active");
            }
        }
    });

    function renderParallax() {
        // Parallax Lerp
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        
        const sectionTop = section.offsetTop;
        const scrollDelta = (scrollY - sectionTop) * 0.15; 

        wrapper.style.transform = `translate(${currentX}%, calc(${currentY}% + ${scrollDelta}px))`;

        // Spotlight Lerp
        currentSpotX += (spotX - currentSpotX) * spotEase;
        currentSpotY += (spotY - currentSpotY) * spotEase;

        if (colorLayer) {
            colorLayer.style.setProperty('--spot-x', `${currentSpotX}%`);
            colorLayer.style.setProperty('--spot-y', `${currentSpotY}%`);
        }

        // Support section parallax logic
        const supportBgContainer = document.querySelector('.js-parallax-support');
        const supportSection = document.getElementById('support-section');
        if (supportBgContainer && supportSection) {
            const supportRect = supportSection.getBoundingClientRect();
            // Engage parallax when support section is slightly visible
            if (supportRect.top < window.innerHeight && supportRect.bottom > 0) {
                // Background moves slower than physical scroll to create intense depth
                const parallaxOffset = supportRect.top * 0.15;
                supportBgContainer.style.transform = `translateY(${parallaxOffset}px)`;
            }
        }

        // Scroll Transition Fade & Upward Shift
        if (scrollY <= window.innerHeight * 1.5) {
            const fadeProgress = scrollY / (window.innerHeight * 0.9); 
            section.style.opacity = Math.max(0, 1 - fadeProgress);
            
            // Hero moves slightly slower than scroll providing intense depth
            section.style.transform = `translateY(${scrollY * 0.25}px)`;
            
            if (landingContent) {
                // Moving the text up slightly faster than background
                landingContent.style.transform = `translateY(-${scrollY * 0.1}px)`;
            }
        }

        requestAnimationFrame(renderParallax);
    }
    
    renderParallax();
}

/* 
 * 4. Support Modal
 * Handles opening, fading in, and closing the minimalistic support modal
 */
function initSupportModal() {
    const supportBtn = document.getElementById("support-btn");
    const supportModal = document.getElementById("support-modal");
    const closeBtn = document.getElementById("support-close-btn");
    const modalContent = document.getElementById("support-modal-content");

    if (!supportBtn || !supportModal || !closeBtn || !modalContent) return;

    // Open modal
    supportBtn.addEventListener("click", () => {
        supportModal.classList.add("is-open");
    });

    // Close modal via close button
    closeBtn.addEventListener("click", () => {
        supportModal.classList.remove("is-open");
    });

    // Close modal by clicking outside
    supportModal.addEventListener("click", (e) => {
        // If the click is on the overlay (not the content), close it
        if (e.target === supportModal) {
            supportModal.classList.remove("is-open");
        }
    });

    // Press 'Escape' to close
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && supportModal.classList.contains("is-open")) {
            supportModal.classList.remove("is-open");
        }
    });

    // Copy UPI ID to clipboard
    const upiText = document.getElementById("upi-text");
    const copyToast = document.getElementById("copy-toast");
    if (upiText && copyToast) {
        upiText.addEventListener("click", () => {
            navigator.clipboard.writeText("dharshilpatil04@okicici").then(() => {
                copyToast.classList.add("is-visible");
                setTimeout(() => {
                    copyToast.classList.remove("is-visible");
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy text: ", err);
            });
        });
    }
}



/* 
 * 6. Lightbox
 * Cinematic fullscreen image overlay
 */
function initLightbox() {
    const figures = document.querySelectorAll('.gallery-figure');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');

    if (!figures.length || !lightbox) return;

    figures.forEach(figure => {
        figure.addEventListener('click', () => {
            const img = figure.querySelector('.gallery-img');
            const caption = figure.querySelector('.gallery-caption');
            
            if (img && lightboxImg) {
                // Ensure browser loads full resolution instead of possible thumbnail
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
            }
            if (caption && lightboxCaption) {
                lightboxCaption.textContent = caption.textContent;
            }
            
            lightbox.classList.add('is-open');
            document.body.style.overflow = 'hidden'; 
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = ''; 
    };

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

}

/* 
 * 7. Interactive Forest Fauna
 * Spawns animated birds and butterflies smoothly floating through the cinematic gallery
 */
function initForestFauna() {
    // Strict Mobile Optimization: Gut fauna generation entirely on limited devices to save extreme DOM repaints
    if (isMobileDevice || isLowPower || prefersReducedMotion) return;

    const container = document.getElementById('fauna-container');
    if (!container) return;

    // Vibrant, colorful tones
    const colors = ['#ffe94d', '#78bdfc', '#ff9b4f', '#ff8cba'];
    
    // Simple stylized SVGs with flutter animation classes
    const svgs = {
        bird: `<svg class="fauna-svg-bird" viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M10,50 Q30,20 50,50 Q70,20 90,50 Q70,40 50,60 Q30,40 10,50 Z" fill="currentColor"/></svg>`,
        butterfly: `<svg class="fauna-svg-butterfly" viewBox="0 0 100 100" style="width:100%; height:100%;"><path d="M50,50 Q20,10 5,40 Q30,60 50,50 Q20,90 40,95 Q50,70 50,50 Q80,10 95,40 Q70,60 50,50 Q80,90 60,95 Q50,70 50,50 Z" fill="currentColor"/></svg>`
    };

    const types = ['bird', 'butterfly'];
    // Scale fauna strictly across device capabilities
    const maxFauna = prefersReducedMotion ? 0 : (isLowPower ? 4 : 25); 
    let activeFauna = 0;

    function spawnFauna(initialYPercent = null) {
        if (activeFauna >= maxFauna) return;
        activeFauna++;

        const el = document.createElement('div');
        const type = types[Math.floor(Math.random() * types.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Random dimensions (slightly larger for clear visibility)
        const size = type === 'bird' ? (20 + Math.random() * 12) : (16 + Math.random() * 10);
        
        el.className = 'fauna-item';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.color = color;
        
        // Randomly set z-index to fall behind or in front (biased slightly to front so they are visible)
        el.style.zIndex = Math.random() > 0.4 ? '6' : '1';
        
        // Depth effects
        if (el.style.zIndex === '1') {
            el.style.filter = 'blur(2px)';
            el.style.opacity = (0.35 + Math.random() * 0.2).toFixed(2); // Higher base visibility
        } else {
            el.style.opacity = (0.6 + Math.random() * 0.3).toFixed(2); // Higher base visibility
        }

        const inner = document.createElement('div');
        inner.className = `fauna-inner fauna-bob-${Math.floor(Math.random() * 3) + 1}`;
        inner.innerHTML = svgs[type];
        if (Math.random() > 0.5) inner.style.transform = 'scaleX(-1)'; // random horizontal flip for variance
        
        el.appendChild(inner);
        container.appendChild(el);

        // Distribution logic
        let currentX = Math.random() * container.offsetWidth;
        let currentY = initialYPercent !== null 
            ? (initialYPercent / 100) * container.offsetHeight 
            : Math.random() * container.offsetHeight;
        
        el.style.transition = 'none';
        el.style.transform = `translate(${currentX}px, ${currentY}px)`;
        
        // Force reflow
        el.getBoundingClientRect();
        
        // Restore soft transition
        el.style.transition = 'transform 12s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 2s ease, filter 2s ease';

        requestAnimationFrame(() => {
            startWandering(el, currentX, currentY);
        });

        // Hover escape interaction
        el.addEventListener('mouseenter', () => {
            el.classList.add('escape');
            
            // Fast distance move outwardly
            const escX = Math.random() > 0.5 ? currentX + 300 : currentX - 300;
            const escY = currentY - 200 - Math.random() * 200; // tends upward
            
            el.style.transform = `translate(${escX}px, ${escY}px) scale(0.6)`;
            
            setTimeout(() => {
                if(el.parentElement) el.remove();
                activeFauna--;
                setTimeout(spawnFauna, 3000 + Math.random() * 3000); // 3-6s delay before respawning
            }, 1500); // Wait for escape animation to finish
        }, { once: true });
    }

    function startWandering(el, startX, startY) {
        let currentX = startX;
        let currentY = startY;

        function pickTarget() {
            if (el.classList.contains('escape')) return;
            
            // Move within a safe bounds mostly. Drift more loosely for curved paths
            const moveRange = 400; // smooth sweep distance
            currentX += (Math.random() - 0.5) * moveRange;
            currentY += (Math.random() - 0.5) * moveRange;
            
            // Soft boundaries (allow slight screen edge clipping but wrap back in)
            if (currentX < -50) currentX = 50;
            if (currentX > container.offsetWidth + 50) currentX = container.offsetWidth - 50;
            if (currentY < -50) currentY = 50;
            if (currentY > container.offsetHeight + 50) currentY = container.offsetHeight - 50;

            el.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }

        // Trigger immediate first drift
        pickTarget();

        // Loop drift every 11 seconds to keep the 12s CSS transition fluid without stopping
        const drift = setInterval(() => {
            if (el.classList.contains('escape')) {
                clearInterval(drift);
                return;
            }
            pickTarget();
        }, 11500);
    }

    // Initial batch spawning (Guarantees even vertical distribution down the tall gallery)
    for (let i = 0; i < maxFauna; i++) {
        // Guarantee consistent spacing, staggered slowly on start
        const yPercent = (i / maxFauna) * 100 + (Math.random() * (100 / maxFauna));
        setTimeout(() => spawnFauna(yPercent), i * 300 + Math.random() * 600);
    }
}


/* 
 * 9. Ambient Audio System
 * Seamlessly loops an ambient background track with dynamic lerped volume
 */
function initAmbientAudio() {
    // Strict Mobile Optimization: Browsers throttle un-focused loops and auto-audio. Abort memory allocation immediately.
    if (isMobileDevice || isLowPower) return;

    const audio = new Audio('images/NewProject.mp3');
    audio.loop = true;
    audio.volume = 0; // Starts silent until interaction fades it in seamlessly
    
    // Append to DOM to prevent browsers from suspending or garbage collecting off-DOM audio
    audio.style.display = 'none';
    document.body.appendChild(audio);

    // Force explicit restart on end just in case native looping drops
    audio.addEventListener('ended', () => {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    });
    
    let isPlaying = false;
    let targetVolume = 0.05; // Base low volume roughly 5% across the site
    let currentVolume = 0;
    
    // Safety flag to prevent overlapping play requests natively
    let playAttempted = false;

    // Start playing seamlessly on first user interaction natively
    function startAudio() {
        if (!playAttempted) {
            playAttempted = true;
            audio.play().then(() => {
                isPlaying = true;
                // Clean up listeners immediately to save memory once autoplay is unlocked
                ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
                    window.removeEventListener(evt, startAudio);
                });
            }).catch(e => {
                // If autoplay is blocked by browser policies (e.g. tracking scroll before a tap), allow a retry
                playAttempted = false; 
            });
        }
    }

    // Bind to standard first-touch interactions
    ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
        window.addEventListener(evt, startAudio, { passive: true });
    });

    // Observe the gallery section to dynamically shift the ambient volume
    const gallerySection = document.getElementById('cinematic-forest');
    if (gallerySection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    targetVolume = 0.4; // Swell volume dynamically inside the immersive gallery
                } else {
                    targetVolume = 0.05; // Fade back down to low ambient level outside it
                }
            });
        }, {
            threshold: 0.15 // Triggers completely only when 15% into the section
        });
        
        observer.observe(gallerySection);
    }

    // Smooth volume fade logic decoupled from the scroll thread for strict 60fps performance
    function lerpVolume() {
        if (isPlaying) {
            // Very slow lerp factor (0.015) creates exactly a buttery 2-3 second cinematic fade in/out
            currentVolume += (targetVolume - currentVolume) * 0.015;
            
            // Apply safe strict bounds physically mapped to the browser WebAudio
            audio.volume = Math.max(0, Math.min(1, currentVolume));
        }
        requestAnimationFrame(lerpVolume);
    }
    
    // Start lerp loop tracking immediately
    lerpVolume();
}
