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

          gsap.from(items, {
            autoAlpha: 0,
            duration: options.duration || 0.9,
            ease: options.ease || "power3.out",
            rotateX: options.rotateX || 0,
            stagger: options.stagger || 0.12,
            transformOrigin: "50% 100%",
            y: options.y || 46,
            scrollTrigger: {
              trigger: options.trigger || items[0],
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

        imageReveal(".service-card > img, .project-card img, .trust-photo img");

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
            .toArray(".service-card > img, .project-card img")
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

        if (document.querySelector(".hero")) {
          setupScrollAnimations();
        }
      }

