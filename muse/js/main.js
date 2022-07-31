if (!window.NexT) window.NexT = {};

(function() {
  const className = 'next-config';

  const staticConfig = {};
  let variableConfig = {};

  const parse = text => JSON.parse(text || '{}');

  const update = name => {
    const targetEle = document.querySelector(`.${className}[data-name="${name}"]`);
    if (!targetEle) return;
    const parsedConfig = parse(targetEle.text);
    if (name === 'main') {
      Object.assign(staticConfig, parsedConfig);
    } else {
      variableConfig[name] = parsedConfig;
    }
  };

  update('main');

  window.NexT.CONFIG = new Proxy({}, {
    get(overrideConfig, name) {
      let existing;
      if (name in staticConfig) {
        existing = staticConfig[name];
      } else {
        if (!(name in variableConfig)) update(name);
        existing = variableConfig[name];
      }

      // For unset override and mixable existing
      if (!(name in overrideConfig) && typeof existing === 'object') {
        // Get ready to mix.
        overrideConfig[name] = {};
      }

      if (name in overrideConfig) {
        const override = overrideConfig[name];

        // When mixable
        if (typeof override === 'object' && typeof existing === 'object') {
          // Mix, proxy changes to the override.
          return new Proxy({ ...existing, ...override }, {
            set(target, prop, value) {
              target[prop] = value;
              override[prop] = value;
              return true;
            }
          });
        }

        return override;
      }

      // Only when not mixable and override hasn't been set.
      return existing;
    }
  });

  // TODO
  // document.addEventListener('pjax:success', () => {
  //   variableConfig = {};
  // });
})();
;
/* global NexT, CONFIG */

HTMLElement.prototype.wrap = function(wrapper) {
  this.parentNode.insertBefore(wrapper, this);
  this.parentNode.removeChild(this);
  wrapper.appendChild(this);
};

(function() {
  const onPageLoaded = () => document.dispatchEvent(
    new Event('page:loaded', {
      bubbles: true
    })
  );

  if (document.readyState === 'loading') {
    document.addEventListener('readystatechange', onPageLoaded, { once: true });
  } else {
    onPageLoaded();
  }
  document.addEventListener('pjax:success', onPageLoaded);
})();

NexT.utils = {

  checkDOMExist: function(selector) {
    return document.querySelector(selector) != null;
  },

  getCDNResource: function(res) {
    let { plugins, router } = NexT.CONFIG.vendor;
    let { name, version, file, alias } = res;

    let npm_name = name;
    let res_src = '';
    switch(plugins) {
      case 'cdnjs':
        let cdnjs_name = alias || name;
        let cdnjs_file = file.replace(/\.js$/, '.min.js').replace(/^(dist|lib|source\/js|)\/(browser\/|)/, '');
        res_src = `${router}/${cdnjs_name}/${version}/${cdnjs_file}`
        break;
      default:
        res_src = `${router}/${npm_name}@${version}/${file}`
    }

    return res_src;
  },

  replacePostCRLink: function() {
    if (NexT.CONFIG.hostname.startsWith('http')) return;
    // Try to support mutli domain without base URL sets.
    let href = window.location.href;
    if (href.indexOf('#')>-1){
      href = href.split('#')[0];
    }
    let postLink = document.getElementById('post-cr-link');
    if (!postLink) return;
    postLink.text = href;
    postLink.href = href;
  },

  /**
   * One-click copy code support.
   */
  registerCopyCode: function() {
    if (!NexT.CONFIG.copybtn) return;

    let figure = document.querySelectorAll('.highlight pre');
    if (figure.length === 0 || !NexT.CONFIG.copybtn) return;
    figure.forEach(element => {
      let cn = element.querySelector('code').className;
      // TODO seems hard code need find other ways fixed it.
      if (cn == '') return;
      element.insertAdjacentHTML('beforeend', '<div class="copy-btn"><i class="fa fa-copy fa-fw"></i></div>');
      const button = element.querySelector('.copy-btn');
      button.addEventListener('click', () => {
        const lines = element.querySelector('.code') || element.querySelector('code');
        const code = lines.innerText;
        if (navigator.clipboard) {
          // https://caniuse.com/mdn-api_clipboard_writetext
          navigator.clipboard.writeText(code).then(() => {
            button.querySelector('i').className = 'fa fa-check-circle fa-fw';
          }, () => {
            button.querySelector('i').className = 'fa fa-times-circle fa-fw';
          });
        } else {
          const ta = document.createElement('textarea');
          ta.style.top = window.scrollY + 'px'; // Prevent page scrolling
          ta.style.position = 'absolute';
          ta.style.opacity = '0';
          ta.readOnly = true;
          ta.value = code;
          document.body.append(ta);
          ta.select();
          ta.setSelectionRange(0, code.length);
          ta.readOnly = false;
          const result = document.execCommand('copy');
          button.querySelector('i').className = result ? 'fa fa-check-circle fa-fw' : 'fa fa-times-circle fa-fw';
          ta.blur(); // For iOS
          button.blur();
          document.body.removeChild(ta);
        }
      });
      element.addEventListener('mouseleave', () => {
        setTimeout(() => {
          button.querySelector('i').className = 'fa fa-copy fa-fw';
        }, 300);
      });
    });
  },

  wrapTableWithBox: function() {
    document.querySelectorAll('table').forEach(element => {
      const box = document.createElement('div');
      box.className = 'table-container';
      element.wrap(box);
    });
  },

  registerVideoIframe: function() {
    document.querySelectorAll('iframe').forEach(element => {
      const supported = [
        'www.youtube.com',
        'player.vimeo.com',
        'player.youku.com',
        'player.bilibili.com',
        'www.tudou.com'
      ].some(host => element.src.includes(host));
      if (supported && !element.parentNode.matches('.video-container')) {
        const box = document.createElement('div');
        box.className = 'video-container';
        element.wrap(box);
        const width = Number(element.width);
        const height = Number(element.height);
        if (width && height) {
          box.style.paddingTop = (height / width * 100) + '%';
        }
      }
    });
  },

  registerScrollPercent: function() {
    const backToTop = document.querySelector('.back-to-top');
    const readingProgressBar = document.querySelector('.reading-progress-bar');
    // For init back to top in sidebar if page was scrolled after page refresh.
    window.addEventListener('scroll', () => {
      if (backToTop || readingProgressBar) {
        const contentHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = contentHeight > 0 ? Math.min(100 * window.scrollY / contentHeight, 100) : 0;
        if (backToTop) {
          backToTop.classList.toggle('back-to-top-on', Math.round(scrollPercent) >= 5);
          backToTop.querySelector('span').innerText = Math.round(scrollPercent) + '%';
        }
        if (readingProgressBar) {
          readingProgressBar.style.setProperty('--progress', scrollPercent.toFixed(2) + '%');
        }
      }
      if (!Array.isArray(NexT.utils.sections)) return;
      let index = NexT.utils.sections.findIndex(element => {
        return element && element.getBoundingClientRect().top > 10;
      });
      if (index === -1) {
        index = NexT.utils.sections.length - 1;
      } else if (index > 0) {
        index--;
      }
      this.activateNavByIndex(index);
    }, { passive: true });

    backToTop && backToTop.addEventListener('click', () => {
      window.anime({
        targets  : document.scrollingElement,
        duration : 500,
        easing   : 'linear',
        scrollTop: 0
      });
    });
  },

  /**
   * Tabs tag listener (without twitter bootstrap).
   */
  registerTabsTag: function() {
    // Binding `nav-tabs` & `tab-content` by real time permalink changing.
    document.querySelectorAll('.tabs ul.nav-tabs .tab').forEach(element => {
      element.addEventListener('click', event => {
        event.preventDefault();
        // Prevent selected tab to select again.
        if (element.classList.contains('active')) return;
        const nav = element.parentNode;
        // Add & Remove active class on `nav-tabs` & `tab-content`.
        [...nav.children].forEach(target => {
          target.classList.toggle('active', target === element);
        });
        // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
        const tActive = document.getElementById(element.querySelector('a').getAttribute('href').replace('#', ''));
        [...tActive.parentNode.children].forEach(target => {
        // Array.prototype.slice.call(tActive.parentNode.children).forEach(target => {
          target.classList.toggle('active', target === tActive);
        });
        // Trigger event
        tActive.dispatchEvent(new Event('tabs:click', {
          bubbles: true
        }));
        if (!NexT.CONFIG.stickytabs) return;
        const offset = nav.parentNode.getBoundingClientRect().top + window.scrollY + 10;
        window.anime({
          targets  : document.scrollingElement,
          duration : 500,
          easing   : 'linear',
          scrollTop: offset
        });
      });
    });

    window.dispatchEvent(new Event('tabs:register'));
  },

  registerCanIUseTag: function() {
    // Get responsive height passed from iframe.
    window.addEventListener('message', ({ data }) => {
      if (typeof data === 'string' && data.includes('ciu_embed')) {
        const featureID = data.split(':')[1];
        const height = data.split(':')[2];
        document.querySelector(`iframe[data-feature=${featureID}]`).style.height = parseInt(height, 10) + 5 + 'px';
      }
    }, false);
  },

  /*registerActiveMenuItem: function() {
    document.querySelectorAll('.menu-item a[href]').forEach(target => {
      const isSamePath = target.pathname === location.pathname || target.pathname === location.pathname.replace('index.html', '');
      const isSubPath = !NexT.CONFIG.root.startsWith(target.pathname) && location.pathname.startsWith(target.pathname);
      target.classList.toggle('menu-item-active', target.hostname === location.hostname && (isSamePath || isSubPath));
    });
  },

  registerLangSelect: function() {
    const selects = document.querySelectorAll('.lang-select');
    selects.forEach(sel => {
      sel.value = NexT.CONFIG.page.lang;
      sel.addEventListener('change', () => {
        const target = sel.options[sel.selectedIndex];
        document.querySelectorAll('.lang-select-label span').forEach(span => {
          span.innerText = target.text;
        });
        // Disable Pjax to force refresh translation of menu item
        window.location.href = target.dataset.href;
      });
    });
  },*/

  registerSidebarTOC: function() {
    this.sections = [...document.querySelectorAll('.post-toc li a.nav-link')].map(element => {
      const target = document.getElementById(decodeURI(element.getAttribute('href')).replace('#', ''));
      // TOC item animation navigate.
      element.addEventListener('click', event => {
        event.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY;
        window.anime({
          targets  : document.scrollingElement,
          duration : 500,
          easing   : 'linear',
          scrollTop: offset,
          complete : () => {
            history.pushState(null, document.title, element.href);
          }
        });
      });
      return target;
    });
  },

  registerPostReward: function() {
    const button = document.querySelector('.reward-container button');
    if (!button) return;
    button.addEventListener('click', () => {
      document.querySelector('.post-reward').classList.toggle('active');
    });
  },

  initCommontesDispaly: function(){   
    const comms = document.querySelectorAll('.comment-wrap > div');
    if (comms.length<=1) return;
    comms.forEach(function(item){
      var dis = window.getComputedStyle(item, null).display;
      item.style.display = dis;
    });
  },

  registerCommonSwitch: function() {
    const button = document.querySelector('.comment-switch .switch-btn');
    if (!button) return;
    const comms = document.querySelectorAll('.comment-wrap > div');
    button.addEventListener('click', () => {
      button.classList.toggle('move');
      comms.forEach(function(item){        
        if (item.style.display === 'none') {
          item.style.cssText = "display: block; animation: tabshow .8s";
        } else {
          item.style.cssText = "display: none;"
        }
      });
    });
  },

  hideCommontes:function() {
    document.querySelector('.post-comments').style.display = 'none';
  },

  hiddeLodingCmp: function(selector) {
    const loadding = document.querySelector(selector).previousElementSibling;
    loadding.style.display = 'none';
  },

  activateNavByIndex: function(index) {
    const target = document.querySelectorAll('.post-toc li a.nav-link')[index];
    if (!target || target.classList.contains('active-current')) return;

    document.querySelectorAll('.post-toc .active').forEach(element => {
      element.classList.remove('active', 'active-current');
    });
    target.classList.add('active', 'active-current');
    let parent = target.parentNode;
    while (!parent.matches('.post-toc')) {
      if (parent.matches('li')) parent.classList.add('active');
      parent = parent.parentNode;
    }
    // Scrolling to center active TOC element if TOC content is taller then viewport.
    const tocElement = document.querySelector('.sidebar-panel-container');
    if (!tocElement.parentNode.classList.contains('sidebar-toc-active')) return;
    window.anime({
      targets  : tocElement,
      duration : 200,
      easing   : 'linear',
      scrollTop: tocElement.scrollTop - (tocElement.offsetHeight / 2) + target.getBoundingClientRect().top - tocElement.getBoundingClientRect().top
    });
  },

  updateSidebarPosition: function() {
    if (window.innerWidth < 992 || NexT.CONFIG.scheme === 'Pisces' || NexT.CONFIG.scheme === 'Gemini') return;
    // Expand sidebar on post detail page by default, when post has a toc.
    const hasTOC = document.querySelector('.post-toc');
    let display = NexT.CONFIG.sidebar;
    if (typeof display !== 'boolean') {
      // There's no definition sidebar in the page front-matter.
      display = NexT.CONFIG.sidebar.display === 'always' || (NexT.CONFIG.sidebar.display === 'post' && hasTOC);
    }
    if (display) {
      window.dispatchEvent(new Event('sidebar:show'));
    }
  },

  activateSidebarPanel: function(index) {
    const duration = 200;
    const sidebar = document.querySelector('.sidebar-inner');
    const panel = document.querySelector('.sidebar-panel-container');
    const activeClassName = ['sidebar-toc-active', 'sidebar-overview-active'];

    if (sidebar.classList.contains(activeClassName[index])) return;

    window.anime({
      duration,
      targets   : panel,
      easing    : 'linear',
      opacity   : 0,
      translateY: [0, -20],
      complete  : () => {
        // Prevent adding TOC to Overview if Overview was selected when close & open sidebar.
        sidebar.classList.replace(activeClassName[1 - index], activeClassName[index]);
        window.anime({
          duration,
          targets   : panel,
          easing    : 'linear',
          opacity   : [0, 1],
          translateY: [-20, 0]
        });
      }
    });
  },

  getStyle: function(src, parent) {    
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', src);

    (parent || document.head).appendChild(link);
  },

  getScript: function(src, options = {}, legacyCondition) {
    if (typeof options === 'function') {
      return this.getScript(src, {
        condition: legacyCondition
      }).then(options);
    }
    const {
      condition = false,
      attributes: {
        id = '',
        async = false,
        defer = false,
        crossOrigin = '',
        dataset = {},
        ...otherAttributes
      } = {},
      parentNode = null
    } = options;
    
    return new Promise((resolve, reject) => {
      if (condition) {
        resolve();
      } else {
        const script = document.createElement('script');

        if (id) script.id = id;
        if (crossOrigin) script.crossOrigin = crossOrigin;
        script.async = async;
        script.defer = defer;
        Object.assign(script.dataset, dataset);
        Object.entries(otherAttributes).forEach(([name, value]) => {
          script.setAttribute(name, String(value));
        });

        script.onload = resolve;
        script.onerror = reject;

        if (typeof src === 'object') {
          const { url, integrity } = src;
          script.src = url;
          if (integrity) {
            script.integrity = integrity;
            script.crossOrigin = 'anonymous';
          }
        } else {
          script.src = src;
        }
        (parentNode || document.head).appendChild(script);
      }
    });
  },

  loadComments: function(selector, legacyCallback) {
    if (legacyCallback) {
      return this.loadComments(selector).then(legacyCallback);
    }
    return new Promise(resolve => {
      const element = document.querySelector(selector);
      if (!element) {
        resolve();
        return;
      }
      const intersectionObserver = new IntersectionObserver((entries, observer) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        resolve();
        observer.disconnect();
      });
      intersectionObserver.observe(element);
    });
  }
};

;
/* global NexT, CONFIG */

NexT.boot = {};

NexT.boot.registerEvents = function() {

  // NexT.utils.registerScrollPercent();
  // NexT.utils.registerCanIUseTag();

  // Mobile top menu bar.
  document.querySelector('.site-nav-toggle .toggle').addEventListener('click', event => {
    event.currentTarget.classList.toggle('toggle-close');
    const siteNav = document.querySelector('.site-nav');
    if (!siteNav) return;
    siteNav.style.setProperty('--scroll-height', siteNav.scrollHeight + 'px');
    document.body.classList.toggle('site-nav-on');
  });

  document.querySelectorAll('.sidebar-nav li').forEach((element, index) => {
    element.addEventListener('click', () => {
      NexT.utils.activateSidebarPanel(index);
    });
  });

  window.addEventListener('hashchange', () => {
    const tHash = location.hash;
    if (tHash !== '' && !tHash.match(/%\S{2}/)) {
      const target = document.querySelector(`.tabs ul.nav-tabs li a[href="${tHash}"]`);
      target && target.click();
    }
  });
};

NexT.boot.refresh = function() {

  if (!NexT.CONFIG.page.isPage) return;
 
  NexT.utils.registerSidebarTOC();
  NexT.utils.replacePostCRLink();
  NexT.utils.registerCopyCode();
  NexT.utils.registerPostReward();
  if(NexT.CONFIG.page.comments) {    
    NexT.utils.initCommontesDispaly();
    NexT.utils.registerCommonSwitch();
  } else {
    NexT.utils.hideCommontes();
  }

  //TODO
   /**
   * Register JS handlers by condition option.
   * Need to add config option in Front-End at 'scripts/helpers/next-config.js' file.
   */
  //NexT.CONFIG.prism && window.Prism.highlightAll();
  /*NexT.CONFIG.mediumzoom && window.mediumZoom('.post-body :not(a) > img, .post-body > img', {
    background: 'var(--content-bg-color)'
  });*/
  // NexT.CONFIG.lazyload && window.lozad('.post-body img').observe();
  // NexT.CONFIG.pangu && window.pangu.spacingPage();
  /*NexT.utils.registerTabsTag();
  NexT.utils.registerActiveMenuItem();
  NexT.utils.registerLangSelect();*/
  /*NexT.utils.wrapTableWithBox();
  NexT.utils.registerVideoIframe();*/

};

NexT.boot.motion = function() {
  // Define Motion Sequence & Bootstrap Motion.
  if (NexT.CONFIG.motion.enable) {
    NexT.motion.integrator
      .add(NexT.motion.middleWares.header)
      .add(NexT.motion.middleWares.postList)
      .add(NexT.motion.middleWares.sidebar)
      .add(NexT.motion.middleWares.footer)
      .bootstrap();
  }
  NexT.utils.updateSidebarPosition();
};

document.addEventListener('DOMContentLoaded', () => {
  NexT.boot.registerEvents();
  NexT.boot.motion();
  NexT.boot.refresh();
});

;
/* global NexT, CONFIG */

NexT.motion = {};

NexT.motion.integrator = {
  queue: [],
  init : function() {
    this.queue = [];
    return this;
  },
  add: function(fn) {
    const sequence = fn();
    if (NexT.CONFIG.motion.async) this.queue.push(sequence);
    else this.queue = this.queue.concat(sequence);
    return this;
  },
  bootstrap: function() {
    if (!NexT.CONFIG.motion.async) this.queue = [this.queue];
    this.queue.forEach(sequence => {
      const timeline = window.anime.timeline({
        duration: 200,
        easing  : 'linear'
      });
      sequence.forEach(item => {
        if (item.deltaT) timeline.add(item, item.deltaT);
        else timeline.add(item);
      });
    });
  }
};

NexT.motion.middleWares = {
  header: function() {
    const sequence = [];

    function getMistLineSettings(targets) {
      sequence.push({
        targets,
        scaleX  : [0, 1],
        duration: 500,
        deltaT  : '-=200'
      });
    }

    function pushToSequence(targets, sequenceQueue = false) {
      sequence.push({
        targets,
        opacity: 1,
        top    : 0,
        deltaT : sequenceQueue ? '-=200' : '-=0'
      });
    }

    pushToSequence('header.header');
    NexT.CONFIG.scheme === 'Mist' && getMistLineSettings('.logo-line');
    NexT.CONFIG.scheme === 'Muse' && pushToSequence('.custom-logo-image');
    pushToSequence('.site-title');
    pushToSequence('.site-brand-container .toggle', true);
    pushToSequence('.site-subtitle');
    (NexT.CONFIG.scheme === 'Pisces' || NexT.CONFIG.scheme === 'Gemini') && pushToSequence('.custom-logo-image');

    document.querySelectorAll('.menu-item').forEach(targets => {
      sequence.push({
        targets,
        complete: () => targets.classList.add('animated', 'fadeInDown'),
        deltaT  : '-=200'
      });
    });

    return sequence;
  },

  subMenu: function() {
    const subMenuItem = document.querySelectorAll('.sub-menu .menu-item');
    if (subMenuItem.length > 0) {
      subMenuItem.forEach(element => {
        element.classList.add('animated');
      });
    }
    return [];
  },

  postList: function() {
    const sequence = [];
    const { postblock, postheader, postbody, collheader } = NexT.CONFIG.motion.transition;

    function animate(animation, selector) {
      if (!animation) return;
      document.querySelectorAll(selector).forEach(targets => {
        sequence.push({
          targets,
          complete: () => targets.classList.add('animated', animation),
          deltaT  : '-=100'
        });
      });
    }

    animate(postblock, '.post-block, .pagination, .post-comments');
    animate(collheader, '.collection-header');
    animate(postheader, '.post-header');
    animate(postbody, '.post-body');

    return sequence;
  },

  sidebar: function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarTransition = NexT.CONFIG.motion.transition.sidebar;
    // Only for Pisces | Gemini.
    if (sidebarTransition && (NexT.CONFIG.scheme === 'Pisces' || NexT.CONFIG.scheme === 'Gemini')) {
      return [{
        targets : sidebar,
        complete: () => sidebar.classList.add('animated', sidebarTransition)
      }];
    }
    return [];
  },

  footer: function() {
    return [{
      targets: document.querySelector('.footer'),
      opacity: 1
    }];
  }
};

;
/* global CONFIG */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const doSaveScroll = () => {
    localStorage.setItem('bookmark' + location.pathname, window.scrollY);
  };

  const scrollToMark = () => {
    let top = localStorage.getItem('bookmark' + location.pathname);
    top = parseInt(top, 10);
    // If the page opens with a specific hash, just jump out
    if (!isNaN(top) && location.hash === '') {
      // Auto scroll to the position
      window.anime({
        targets  : document.scrollingElement,
        duration : 200,
        easing   : 'linear',
        scrollTop: top
      });
    }
  };
  // Register everything
  const init = function(trigger) {
    // Create a link element
    const link = document.querySelector('.book-mark-link');
    // Scroll event
    window.addEventListener('scroll', () => link.classList.toggle('book-mark-link-fixed', window.scrollY === 0), { passive: true });
    // Register beforeunload event when the trigger is auto
    if (trigger === 'auto') {
      // Register beforeunload event
      window.addEventListener('beforeunload', doSaveScroll);
      document.addEventListener('pjax:send', doSaveScroll);
    }
    // Save the position by clicking the icon
    link.addEventListener('click', () => {
      doSaveScroll();
      window.anime({
        targets : link,
        duration: 200,
        easing  : 'linear',
        top     : -30,
        complete: () => {
          setTimeout(() => {
            link.style.top = '';
          }, 400);
        }
      });
    });
    scrollToMark();
    document.addEventListener('pjax:success', scrollToMark);
  };

  init(NexT.CONFIG.bookmark.save);
});

;
document.addEventListener('DOMContentLoaded', () => {

  const element = '.addthis_inline_share_toolbox';
  if (!NexT.CONFIG.addthis || !NexT.utils.checkDOMExist(element)) return; 

  const addthis_js = NexT.CONFIG.addthis.js + '?pubid=' + NexT.CONFIG.addthis.cfg.pubid;

  NexT.utils.loadComments(element).then(() => {
    NexT.utils.getScript(addthis_js, {
      attributes: {
        async: true
      },
      parentNode: document.querySelector(element)
    });
  });
});
;
document.addEventListener('DOMContentLoaded', () => {

  const element = '.waline-container';
  if (!NexT.CONFIG.page.comments 
    || !NexT.CONFIG.waline
    || !NexT.utils.checkDOMExist(element)) return; 
  
  const {
    emoji, 
    imguploader, 
    pageview, 
    placeholder, 
    requiredmeta, 
    serverurl, 
    wordlimit
  } = NexT.CONFIG.waline.cfg;


  const waline_css = NexT.utils.getCDNResource(NexT.CONFIG.waline.css);
  NexT.utils.getStyle(waline_css, null);

  const waline_js = NexT.utils.getCDNResource(NexT.CONFIG.waline.js);

  const locale = {
    placeholder: placeholder
  };

  NexT.utils.loadComments(element)
    .then(() => NexT.utils.getScript(waline_js, {
    }))
    .then(() => {

      Waline.init({
        locale,
        el            : element,
        pageview      : pageview,
        emoji         : emoji,
        imageUploader : imguploader,
        wordLimit     : wordlimit,
        requiredMeta  : requiredmeta,
        serverURL     : serverurl,
        lang          : NexT.CONFIG.lang,
        dark          : "auto"
      });

      NexT.utils.hiddeLodingCmp(element);
  });
});
;
document.addEventListener('DOMContentLoaded', () => {

  const element = '.giscus-container';
  if (!NexT.CONFIG.page.comments 
    || !NexT.CONFIG.giscus
    || !NexT.utils.checkDOMExist(element)) return;

  const { 
    category, 
    categoryid, 
    emit, 
    inputposition, 
    mapping, 
    reactions, 
    repo, 
    repoid, 
    theme } = NexT.CONFIG.giscus.cfg;


  NexT.utils.loadComments(element)
    .then(() => NexT.utils.getScript(NexT.CONFIG.giscus.js, {
      attributes: {
        'async'                  : true,
        'crossorigin'            : 'anonymous',
        'data-repo'              : repo,
        'data-repo-id'           : repoid,
        'data-category'          : category,
        'data-category-id'       : categoryid,
        'data-mapping'           : mapping,
        'data-reactions-enabled' : reactions ? 1:0,
        'data-emit-metadata'     : emit ? 1:0,
        'data-input-position'    : inputposition,
        'data-theme'             : theme,
        'data-lang'              : NexT.CONFIG.lang,
        'data-loading'           : 'lazy'
      },
      parentNode: document.querySelector(element)
    }));

    NexT.utils.hiddeLodingCmp(element);
});
;
/* global CONFIG, pjax, LocalSearch */
class LocalSearch {
  constructor({
    path = '',
    unescape = false,
    top_n_per_article = 1
  }) {
    this.path = path;
    this.unescape = unescape;
    this.top_n_per_article = top_n_per_article;
    this.isfetched = false;
    this.datas = null;
  }

  getIndexByWord(words, text, caseSensitive = false) {
    const index = [];
    const included = new Set();

    if (!caseSensitive) {
      text = text.toLowerCase();
    }
    words.forEach(word => {
      if (this.unescape) {
        const div = document.createElement('div');
        div.innerText = word;
        word = div.innerHTML;
      }
      const wordLen = word.length;
      if (wordLen === 0) return;
      let startPosition = 0;
      let position = -1;
      if (!caseSensitive) {
        word = word.toLowerCase();
      }
      while ((position = text.indexOf(word, startPosition)) > -1) {
        index.push({ position, word });
        included.add(word);
        startPosition = position + wordLen;
      }
    });
    // Sort index by position of keyword
    index.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }
      return right.word.length - left.word.length;
    });
    return [index, included];
  }

  // Merge hits into slices
  mergeIntoSlice(start, end, index) {
    let item = index[0];
    let { position, word } = item;
    const hits = [];
    const count = new Set();
    while (position + word.length <= end && index.length !== 0) {
      count.add(word);
      hits.push({
        position,
        length: word.length
      });
      const wordEnd = position + word.length;

      // Move to next position of hit
      index.shift();
      while (index.length !== 0) {
        item = index[0];
        position = item.position;
        word = item.word;
        if (wordEnd > position) {
          index.shift();
        } else {
          break;
        }
      }
    }
    return {
      hits,
      start,
      end,
      count: count.size
    };
  }

  // Highlight title and content
  highlightKeyword(val, slice) {
    let result = '';
    let index = slice.start;
    for (const { position, length } of slice.hits) {
      result += val.substring(index, position);
      index = position + length;
      result += `<mark class="search-keyword">${val.substr(position, length)}</mark>`;
    }
    result += val.substring(index, slice.end);
    return result;
  }

  getResultItems(keywords) {
    const resultItems = [];
    this.datas.forEach(({ title, content, url }) => {
      // The number of different keywords included in the article.
      const [indexOfTitle, keysOfTitle] = this.getIndexByWord(keywords, title);
      const [indexOfContent, keysOfContent] = this.getIndexByWord(keywords, content);
      const includedCount = new Set([...keysOfTitle, ...keysOfContent]).size;

      // Show search results
      const hitCount = indexOfTitle.length + indexOfContent.length;
      if (hitCount === 0) return;

      const slicesOfTitle = [];
      if (indexOfTitle.length !== 0) {
        slicesOfTitle.push(this.mergeIntoSlice(0, title.length, indexOfTitle));
      }

      let slicesOfContent = [];
      while (indexOfContent.length !== 0) {
        const item = indexOfContent[0];
        const { position } = item;
        // Cut out 100 characters. The maxlength of .search-input is 80.
        const start = Math.max(0, position - 20);
        const end = Math.min(content.length, position + 80);
        slicesOfContent.push(this.mergeIntoSlice(start, end, indexOfContent));
      }

      // Sort slices in content by included keywords' count and hits' count
      slicesOfContent.sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count;
        } else if (left.hits.length !== right.hits.length) {
          return right.hits.length - left.hits.length;
        }
        return left.start - right.start;
      });

      // Select top N slices in content
      const upperBound = parseInt(this.top_n_per_article, 10);
      if (upperBound >= 0) {
        slicesOfContent = slicesOfContent.slice(0, upperBound);
      }

      let resultItem = '';

      url = new URL(url, location.origin);
      url.searchParams.append('highlight', keywords.join(' '));

      if (slicesOfTitle.length !== 0) {
        resultItem += `<li><a href="${url.href}" class="search-result-title">${this.highlightKeyword(title, slicesOfTitle[0])}</a>`;
      } else {
        resultItem += `<li><a href="${url.href}" class="search-result-title">${title}</a>`;
      }

      slicesOfContent.forEach(slice => {
        resultItem += `<a href="${url.href}"><p class="search-result">${this.highlightKeyword(content, slice)}...</p></a>`;
      });

      resultItem += '</li>';
      resultItems.push({
        item: resultItem,
        id  : resultItems.length,
        hitCount,
        includedCount
      });
    });
    return resultItems;
  }

  fetchData() {
    const isXml = !this.path.endsWith('json');
    fetch(this.path)
      .then(response => response.text())
      .then(res => {
        // Get the contents from search data
        this.isfetched = true;
        this.datas = isXml ? [...new DOMParser().parseFromString(res, 'text/xml').querySelectorAll('entry')].map(element => ({
          title  : element.querySelector('title').textContent,
          content: element.querySelector('content').textContent,
          url    : element.querySelector('url').textContent
        })) : JSON.parse(res);
        // Only match articles with non-empty titles
        this.datas = this.datas.filter(data => data.title).map(data => {
          data.title = data.title.trim();
          data.content = data.content ? data.content.trim().replace(/<[^>]+>/g, '') : '';
          data.url = decodeURIComponent(data.url).replace(/\/{2,}/g, '/');
          return data;
        });
        // Remove loading animation
        window.dispatchEvent(new Event('search:loaded'));
      });
  }

  // Highlight by wrapping node in mark elements with the given class name
  highlightText(node, slice, className) {
    const val = node.nodeValue;
    let index = slice.start;
    const children = [];
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position));
      index = position + length;
      const mark = document.createElement('mark');
      mark.className = className;
      mark.appendChild(document.createTextNode(val.substr(position, length)));
      children.push(text, mark);
    }
    node.nodeValue = val.substring(index, slice.end);
    children.forEach(element => {
      node.parentNode.insertBefore(element, node);
    });
  }

  // Highlight the search words provided in the url in the text
  highlightSearchWords(body) {
    const params = new URL(location.href).searchParams.get('highlight');
    const keywords = params ? params.split(' ') : [];
    if (!keywords.length || !body) return;
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    const allNodes = [];
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea')) allNodes.push(walk.currentNode);
    }
    allNodes.forEach(node => {
      const [indexOfNode] = this.getIndexByWord(keywords, node.nodeValue);
      if (!indexOfNode.length) return;
      const slice = this.mergeIntoSlice(0, node.nodeValue.length, indexOfNode);
      this.highlightText(node, slice, 'search-keyword');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (! NexT.CONFIG.localSearch.path) {
    // Search DB path
    console.warn('`search indexes file` is not configurate!');
    return;
  }
  const localSearch = new LocalSearch({
    path             : NexT.CONFIG.localSearch.path,
    top_n_per_article: NexT.CONFIG.localSearch.topnperarticle,
    unescape         : NexT.CONFIG.localSearch.unescape
  });

  const input = document.querySelector('.search-input');

  const inputEventFunction = () => {
    if (!localSearch.isfetched) return;
    const searchText = input.value.trim().toLowerCase();
    const keywords = searchText.split(/[-\s]+/);
    const container = document.querySelector('.search-result-container');
    let resultItems = [];
    if (searchText.length > 0) {
      // Perform local searching
      resultItems = localSearch.getResultItems(keywords);
    }
    if (keywords.length === 1 && keywords[0] === '') {
      container.classList.add('no-result');
      container.innerHTML = '<div class="search-result-icon"><i class="fa fa-search fa-5x"></i></div>';
    } else if (resultItems.length === 0) {
      container.classList.add('no-result');
      container.innerHTML = '<div class="search-result-icon"><i class="far fa-frown fa-5x"></i></div>';
    } else {
      resultItems.sort((left, right) => {
        if (left.includedCount !== right.includedCount) {
          return right.includedCount - left.includedCount;
        } else if (left.hitCount !== right.hitCount) {
          return right.hitCount - left.hitCount;
        }
        return right.id - left.id;
      });
      const stats = NexT.CONFIG.i18n.hits.replace('${hits}', resultItems.length);

      container.classList.remove('no-result');
      container.innerHTML = `<div class="search-stats">${stats}</div>
        <hr>
        <ul class="search-result-list">${resultItems.map(result => result.item).join('')}</ul>`;
      if (typeof pjax === 'object') pjax.refresh(container);
    }
  };

  localSearch.highlightSearchWords(document.querySelector('.post-body'));
  if (NexT.CONFIG.localSearch.preload) {
    localSearch.fetchData();
  }

  if (NexT.CONFIG.localSearch.trigger === 'auto') {
    input.addEventListener('input', inputEventFunction);
  } else {
    document.querySelector('.search-icon').addEventListener('click', inputEventFunction);
    input.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        inputEventFunction();
      }
    });
  }
  window.addEventListener('search:loaded', inputEventFunction);

  // Handle and trigger popup window
  document.querySelectorAll('.popup-trigger').forEach(element => {
    element.addEventListener('click', () => {
      document.body.classList.add('search-active');
      // Wait for search-popup animation to complete
      setTimeout(() => input.focus(), 500);
      if (!localSearch.isfetched) localSearch.fetchData();
    });
  });

  // Monitor main search box
  const onPopupClose = () => {
    document.body.classList.remove('search-active');
  };

  document.querySelector('.search-pop-overlay').addEventListener('click', event => {
    if (event.target === document.querySelector('.search-pop-overlay')) {
      onPopupClose();
    }
  });
  document.querySelector('.popup-btn-close').addEventListener('click', onPopupClose);
  document.addEventListener('pjax:success', () => {
    localSearch.highlightSearchWords(document.querySelector('.post-body'));
    onPopupClose();
  });
  window.addEventListener('keyup', event => {
    if (event.key === 'Escape') {
      onPopupClose();
    }
  });
});
