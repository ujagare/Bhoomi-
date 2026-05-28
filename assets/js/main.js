      function initPageLoader() {
        if (!document.body) {
          return;
        }

        const loader = document.createElement("div");
        loader.className = "page-loader";
        loader.setAttribute("role", "status");
        loader.setAttribute("aria-live", "polite");
        loader.innerHTML = `
          <div class="page-loader-inner">
            <svg id="svgCircleProgress1" class="svgloader" height="160" width="160" viewBox="0 0 160 160" aria-hidden="true">
              <circle class="svgloader-track" cx="80" cy="80" r="58" stroke-width="11" fill="transparent"></circle>
              <circle id="svgCircleProgressPath1" class="svgloader-path" cx="80" cy="80" r="58" stroke-width="11" fill="transparent" transform="rotate(-90, 80, 80)"></circle>
            </svg>
            <div id="percent" class="page-loader-percent">0%</div>
          </div>
        `;

        document.body.prepend(loader);
        document.body.classList.add("has-page-loader");

        const progressPath = loader.querySelector("#svgCircleProgressPath1");
        const percentElement = loader.querySelector("#percent");
        const duration = 2600;
        const circumference = 2 * Math.PI * 58;
        let progress = 0;
        let isLoaded = false;
        let animationFrame = 0;
        let startedAt = 0;

        progressPath.style.strokeDasharray = circumference;
        progressPath.style.strokeDashoffset = circumference;

        function setProgress(value) {
          progress = Math.max(progress, Math.min(value, 100));
          progressPath.style.strokeDashoffset =
            circumference - (circumference * progress) / 100;
          percentElement.textContent = `${Math.round(progress)}%`;
          percentElement.style.opacity = String(Math.max(progress / 100, 0.2));
        }

        function hideLoader() {
          setProgress(100);

          window.setTimeout(() => {
            loader.classList.add("is-hidden");
            document.body.classList.remove("has-page-loader");
          }, 260);

          window.setTimeout(() => {
            loader.remove();
          }, 820);
        }

        function easeOutCubic(value) {
          return 1 - Math.pow(1 - value, 3);
        }

        function tick(time) {
          if (!startedAt) {
            startedAt = time;
          }

          const elapsed = time - startedAt;
          const timedProgress = easeOutCubic(Math.min(elapsed / duration, 1)) * 100;
          const cappedProgress = isLoaded ? timedProgress : Math.min(timedProgress, 92);

          setProgress(cappedProgress);

          if (progress >= 100 && isLoaded) {
            hideLoader();
            return;
          }

          animationFrame = window.requestAnimationFrame(tick);
        }

        window.addEventListener(
          "load",
          () => {
            isLoaded = true;
          },
          { once: true },
        );

        window.setTimeout(() => {
          if (!isLoaded) {
            isLoaded = true;
          }
        }, 3000);

        setProgress(0);
        animationFrame = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(animationFrame);
      }

      initPageLoader();

      const heroTexts = [
        {
          eyebrow: "Engineering Safety. Building Trust.",
          title: "Strong Foundations.",
          accent: "Safer Tomorrows.",
          copy: "Specialized in Rockfall Protection,<br />Slope Stabilization and Quality<br />Construction solutions.",
        },
        {
          eyebrow: "Rockfall Protection Experts",
          title: "Secure Slopes.",
          accent: "Protected Roads.",
          copy: "Advanced systems designed to control rockfall risks<br />across highways, tunnels and critical infrastructure.",
        },
        {
          eyebrow: "Precision Civil Engineering",
          title: "Built Strong.",
          accent: "Delivered Right.",
          copy: "Reliable construction execution with quality materials,<br />disciplined planning and experienced site teams.",
        },
        {
          eyebrow: "End To End Project Support",
          title: "From Design.",
          accent: "To Maintenance.",
          copy: "Complete project assistance from consultation and engineering<br />to execution, inspection and long-term support.",
        },
      ];

      const heroEyebrow = document.querySelector("#heroEyebrow");
      const heroTitle = document.querySelector("#heroTitle");
      const heroCopy = document.querySelector("#heroCopy");
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const hasHeroText = heroEyebrow && heroTitle && heroCopy;
      let activeHeroText = 0;

      function getHeroRevealItems() {
        return document.querySelectorAll(".hero .reveal-line > span");
      }

      function renderHeroCopy(copy) {
        return copy
          .split(/<br\s*\/?>/i)
          .map(
            (line) =>
              `<span class="reveal-line"><span>${line.trim()}</span></span>`,
          )
          .join("");
      }

      function setHeroText(index) {
        const nextText = heroTexts[index];

        function updateText() {
          heroEyebrow.textContent = nextText.eyebrow;
          heroTitle.innerHTML = `
            <span class="reveal-line"><span>${nextText.title}</span></span>
            <span class="reveal-line accent"><span>${nextText.accent}</span></span>
          `;
          heroCopy.innerHTML = renderHeroCopy(nextText.copy);
        }

        if (window.gsap && !reduceMotion) {
          gsap.to(getHeroRevealItems(), {
            duration: 0.42,
            ease: "power3.in",
            yPercent: -115,
            onComplete: () => {
              updateText();
              gsap.fromTo(
                getHeroRevealItems(),
                { yPercent: 115 },
                {
                  duration: 0.85,
                  ease: "power4.out",
                  stagger: 0.09,
                  yPercent: 0,
                },
              );
            },
          });
        } else {
          updateText();
        }
      }

      if (hasHeroText) {
        setInterval(() => {
          activeHeroText = (activeHeroText + 1) % heroTexts.length;
          setHeroText(activeHeroText);
        }, 5000);
      }

      const menuToggle = document.querySelector(".menu-toggle");
      const menuClose = document.querySelector(".menu-close");
      const mobileMenu = document.querySelector("#mobileMenu");
      const mobileMenuLinks = document.querySelectorAll(".mobile-menu a");

      function closeMobileMenu() {
        menuToggle.setAttribute("aria-expanded", "false");
        mobileMenu.setAttribute("aria-hidden", "true");
        mobileMenu.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      }

      function openMobileMenu() {
        menuToggle.setAttribute("aria-expanded", "true");
        mobileMenu.setAttribute("aria-hidden", "false");
        mobileMenu.classList.add("is-open");
        document.body.classList.add("menu-open");
      }

      menuToggle.addEventListener("click", () => {
        if (mobileMenu.classList.contains("is-open")) {
          closeMobileMenu();
        } else {
          openMobileMenu();
        }
      });

      menuClose.addEventListener("click", closeMobileMenu);
      mobileMenuLinks.forEach((link) =>
        link.addEventListener("click", closeMobileMenu),
      );
      mobileMenu.addEventListener("click", (event) => {
        if (event.target === mobileMenu) {
          closeMobileMenu();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMobileMenu();
        }
      });

      const contactForm = document.querySelector(".contact-form");

      if (contactForm) {
        const status = contactForm.querySelector(".form-status");
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const submitLabel = submitButton ? submitButton.innerHTML : "";

        function setContactStatus(type, message) {
          if (!status) {
            return;
          }

          status.textContent = message;
          status.className = `form-status ${type ? `is-${type}` : ""}`.trim();
        }

        function trimValue(formData, key, maxLength) {
          const value = String(formData.get(key) || "").trim();
          return value ? value.slice(0, maxLength) : "";
        }

        contactForm.addEventListener("submit", async (event) => {
          event.preventDefault();

          if (!contactForm.reportValidity()) {
            return;
          }

          const formData = new FormData(contactForm);

          if (String(formData.get("website") || "").trim()) {
            contactForm.reset();
            return;
          }

          const payload = {
            name: trimValue(formData, "name", 120),
            email: trimValue(formData, "email", 180),
            phone: trimValue(formData, "phone", 40),
            service: trimValue(formData, "service", 120),
            message: trimValue(formData, "message", 2000),
            website: trimValue(formData, "website", 120),
            page_url: window.location.href.slice(0, 500),
          };

          if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = "Sending...";
          }
          setContactStatus("", "");

          try {
            const response = await fetch("/api/contact", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.ok !== true) {
              throw new Error(result.message || "Contact request failed");
            }

            contactForm.reset();
            setContactStatus(
              "success",
              "Thank you. Your message has been sent successfully.",
            );
          } catch (error) {
            setContactStatus(
              "error",
              "Sorry, we could not send your message right now. Please call or WhatsApp us.",
            );
            console.error("Contact form error:", error);
          } finally {
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.innerHTML = submitLabel;
            }
          }
        });
      }

      const galleryFilters = document.querySelectorAll("[data-filter]");
      const galleryItems = document.querySelectorAll(
        ".gallery-card, .gallery-video, .project-card-panel",
      );

      galleryFilters.forEach((button) => {
        button.addEventListener("click", () => {
          const filter = button.dataset.filter;

          galleryFilters.forEach((item) => item.classList.remove("active"));
          button.classList.add("active");

          galleryItems.forEach((item) => {
            const shouldShow =
              filter === "all" || item.dataset.category === filter;
            item.classList.toggle("is-hidden", !shouldShow);
          });
        });
      });

      function setupScrollAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        const mm = gsap.matchMedia();

        function revealGroup(selector, options = {}) {
          const items = gsap.utils.toArray(selector);

          if (!items.length) {
            return;
          }

          if (!options.trigger) {
            items.forEach((item) => {
              gsap.from(item, {
                autoAlpha: 0,
                duration: options.duration || 0.9,
                ease: options.ease || "power3.out",
                rotateX: options.rotateX || 0,
                transformOrigin: "50% 100%",
                y: options.y || 46,
                scrollTrigger: {
                  trigger: item,
                  start: options.start || "top 86%",
                  toggleActions: "play none none reverse",
                },
              });
            });
            return;
          }

          const hasTrigger = document.querySelector(options.trigger);

          gsap.from(items, {
            autoAlpha: 0,
            duration: options.duration || 0.9,
            ease: options.ease || "power3.out",
            rotateX: options.rotateX || 0,
            stagger: options.stagger || 0.12,
            transformOrigin: "50% 100%",
            y: options.y || 46,
            scrollTrigger: {
              trigger: hasTrigger ? options.trigger : items[0],
              start: options.start || "top 82%",
              toggleActions: "play none none reverse",
            },
          });
        }

        function imageReveal(selector, options = {}) {
          gsap.utils.toArray(selector).forEach((image) => {
            gsap.from(image, {
              autoAlpha: 0,
              clipPath: "inset(12% 10% 12% 10%)",
              duration: options.duration || 1.15,
              ease: "power3.out",
              scale: options.scale || 1.12,
              y: options.y || 34,
              scrollTrigger: {
                trigger: image,
                start: options.start || "top 86%",
                toggleActions: "play none none reverse",
              },
            });
          });
        }

        revealGroup(".section-kicker, h2", {
          duration: 0.75,
          stagger: 0.08,
          y: 26,
        });
        revealGroup(".section-intro p:not(.section-kicker), .projects-head a", {
          duration: 0.8,
          y: 24,
        });
        revealGroup(".service-card", {
          duration: 0.95,
          rotateX: 4,
          stagger: 0.14,
          trigger: ".services",
          y: 58,
        });
        revealGroup(".feature-grid > div", {
          duration: 0.75,
          stagger: 0.08,
          trigger: ".trust-band",
          y: 30,
        });
        revealGroup(".project-card", {
          duration: 0.9,
          stagger: 0.1,
          trigger: ".project-grid",
          y: 42,
        });
        revealGroup(".home-client-logo, .home-client-proof div", {
          duration: 0.82,
          stagger: 0.075,
          trigger: ".home-clients",
          y: 34,
        });
        revealGroup(".industry-row > div", {
          duration: 0.72,
          stagger: 0.055,
          trigger: ".industries",
          y: 30,
        });
        revealGroup(".why-list li", {
          duration: 0.72,
          stagger: 0.08,
          trigger: ".why-list",
          y: 28,
        });
        revealGroup(".testimonial-marquee, .build-card", {
          duration: 0.95,
          stagger: 0.16,
          trigger: ".why-panel",
          y: 54,
        });
        revealGroup(".faq-list details", {
          duration: 0.78,
          stagger: 0.08,
          trigger: ".home-faq",
          y: 28,
        });
        revealGroup(".cert-row > *", {
          duration: 0.7,
          stagger: 0.055,
          trigger: ".certs",
          y: 24,
        });
        revealGroup(
          ".contact-strip > *, .footer-grid > div, .footer-bottom > p",
          {
            duration: 0.8,
            stagger: 0.1,
            trigger: ".contact-strip",
            y: 34,
          },
        );

        // About Page specific animations
        revealGroup(".about-strengths > div", {
          duration: 0.8,
          stagger: 0.1,
          trigger: ".about-strengths",
          y: 30,
        });
        revealGroup(".about-copy-panel > *", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".about-copy-panel",
          y: 24,
        });
        revealGroup(".about-feature > *", {
          duration: 0.8,
          stagger: 0.1,
          trigger: ".about-feature",
          y: 24,
        });
        revealGroup(".about-service-list > article", {
          duration: 0.9,
          stagger: 0.12,
          trigger: ".about-service-list",
          y: 40,
        });
        revealGroup(".vision-card > article", {
          duration: 0.85,
          stagger: 0.1,
          trigger: ".vision-card",
          y: 30,
        });
        revealGroup(".leader-card", {
          duration: 0.9,
          stagger: 0.12,
          trigger: ".leader-grid",
          y: 40,
        });
        revealGroup(".about-facts > div > article", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".about-facts",
          y: 24,
        });
        revealGroup(".about-why-grid > article", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".about-why-grid",
          y: 30,
        });
        revealGroup(".trusted-logo-card", {
          duration: 0.8,
          stagger: 0.06,
          trigger: ".trusted-logo-grid",
          y: 24,
        });
        revealGroup(".infra-grid > article", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".infra-grid",
          y: 30,
        });

        // Service Page specific animations
        revealGroup(".service-detail-card", {
          duration: 0.9,
          stagger: 0.14,
          trigger: ".service-detail-grid",
          y: 40,
        });
        revealGroup(".process-row > article", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".process-row",
          y: 30,
        });
        revealGroup(".service-why-grid > article", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".service-why-grid",
          y: 30,
        });

        // Project Page specific animations
        revealGroup(".project-card-panel", {
          duration: 0.85,
          stagger: 0.1,
          trigger: ".project-card-grid",
          y: 34,
        });
        revealGroup(".project-impact > div", {
          duration: 0.8,
          stagger: 0.08,
          trigger: ".project-impact",
          y: 24,
        });

        // Gallery Page specific animations
        revealGroup(".gallery-card, .gallery-video", {
          duration: 0.8,
          stagger: 0.06,
          trigger: ".gallery-section",
          y: 30,
        });

        imageReveal(".service-card > img, .project-card img, .trust-photo img, .about-feature img, .about-service-list img, .leader-card img, .infra-grid img, .service-detail-image img, .project-card-panel img, .gallery-card img");

        gsap.utils.toArray(".floating-icon, .contact-badge").forEach((icon) => {
          gsap.from(icon, {
            autoAlpha: 0,
            duration: 0.75,
            ease: "back.out(1.8)",
            scale: 0.72,
            scrollTrigger: {
              trigger: icon,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
        });

        mm.add("(min-width: 821px)", () => {
          gsap.utils
            .toArray(".service-card > img, .project-card img, .service-detail-image img, .project-card-panel img, .gallery-card img")
            .forEach((image) => {
              gsap.to(image, {
                ease: "none",
                scale: 1.08,
                yPercent: -8,
                scrollTrigger: {
                  trigger: image.closest("article") || image,
                  scrub: 0.8,
                  start: "top bottom",
                  end: "bottom top",
                },
              });
            });

          if (document.querySelector(".trust-photo")) {
            gsap.to(".trust-photo", {
              ease: "none",
              yPercent: -8,
              scrollTrigger: {
                trigger: ".trust-band",
                scrub: 0.8,
                start: "top bottom",
                end: "bottom top",
              },
            });
          }
        });

        ScrollTrigger.refresh();
      }

      if (!reduceMotion) {
        const lenis = new Lenis({
          duration: 1.15,
          smoothWheel: true,
          wheelMultiplier: 0.9,
          touchMultiplier: 1.15,
        });

        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }

        lenis.on("scroll", ScrollTrigger.update);
        requestAnimationFrame(raf);

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
          link.addEventListener("click", (event) => {
            const hash = link.getAttribute("href");

            if (!hash || hash === "#") {
              event.preventDefault();
              lenis.scrollTo(0);
              return;
            }

            const target = document.querySelector(hash);

            if (target) {
              event.preventDefault();
              lenis.scrollTo(target);
            }
          });
        });

        gsap.from(".site-header", {
          autoAlpha: 0,
          duration: 0.8,
          ease: "power2.out",
          y: -24,
        });

        if (window.matchMedia("(min-width: 821px)").matches) {
          gsap.fromTo(
            getHeroRevealItems(),
            { yPercent: 115 },
            {
              duration: 1,
              ease: "power4.out",
              stagger: 0.1,
              yPercent: 0,
            },
          );
        }

        // Run scroll trigger animations unconditionally on all pages
        setupScrollAnimations();
      }

