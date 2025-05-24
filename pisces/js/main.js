/* global NexT, boot, CONFIG */
window.NexT = {};
NexT.boot = {};
NexT.plugins = {};

// Defined comment component & add register event
NexT.plugins.comments = {};
NexT.plugins.comments.register = function() {
  if (!NexT.CONFIG.page.comments) return;
  for(var c in NexT.plugins.comments) { 
    if (c === 'register') continue;
    eval('NexT.plugins.comments.'+c)();
  };
}

// Defined search engine & add register event
NexT.plugins.search = {}
NexT.plugins.search.register = function() {
  for(var s in NexT.plugins.search) { 
    if (s === 'register') continue;
    eval('NexT.plugins.search.'+s)();
  };
}

// Defined share plugin & add register event
NexT.plugins.share = {}
NexT.plugins.share.register = function() {
  for(var s in NexT.plugins.share) { 
    if (s === 'register') continue;
    eval('NexT.plugins.share.'+s)();
  };
}

// Defined other plugin & add register event
NexT.plugins.others = {}
NexT.plugins.others.register = function() {
  for(var o in NexT.plugins.others) { 
    if (o === 'register') continue;
    eval('NexT.plugins.others.'+o)();
  };
}

// Add event to register all third party plugins
NexT.plugins.register = function() {
  for(var p in NexT.plugins) {
    if (p === 'register') continue;
    eval('NexT.plugins.'+p+'.register')();
  }
};

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
/* util tools */

HTMLElement.prototype.wrap = function (wrapper) {
  this.parentNode.insertBefore(wrapper, this);
  this.parentNode.removeChild(this);
  wrapper.appendChild(this);
};

NexT.utils = {
  registerAPlayer: function () {
    this.getStyle(
      NexT.utils.getCDNResource(NexT.CONFIG.page.music.css)
    );
    
    NexT.CONFIG.page.music.js.forEach(function(js) {
      NexT.utils.getScript(NexT.utils.getCDNResource(js), true);
    });
    
  },
  calPostExpiredDate: function() {
    const postMetaDom = document.querySelector('.post-meta-container');
    let postTime = postMetaDom.querySelector('time[itemprop="dateCreated datePublished"]').getAttribute("datetime");
    let postLastmodTime = postMetaDom.querySelector('time[itemprop="dateModified dateLastmod"]');

    if (postLastmodTime != null) postTime = postLastmodTime.getAttribute("datetime");

    let expiredTip = '';
    const expireCfg = NexT.CONFIG.page.expiredTips;
    let expiredTime = this.diffDate(postTime, 2);

    if (expiredTime.indexOf(NexT.CONFIG.i18n.ds_years) > -1) {
      expiredTip = expireCfg.warn.split('#');
    } else {
      let days = parseInt(expiredTime.replace(NexT.CONFIG.i18n.ds_days, '').trim(), 10);
      if (days < 180)  return; 
      expiredTip = expireCfg.info.split('#');
    }

    let expiredTipPre = expiredTip[0];
    let expiredTipSuf = expiredTip[1];
    expiredTip = expiredTipPre + '<span class="post-expired-times">' + expiredTime + '</span>' + expiredTipSuf;
    document.getElementById('post-expired-content').innerHTML = expiredTip;
    this.domAddClass('#post-expired-tip', 'show');
  },
  registerMenuClick: function () {
    const pMenus = document.querySelectorAll('.main-menu > li > a.menus-parent');
    pMenus.forEach(function (item) {
      const icon = item.querySelector('span > i');
      var ul = item.nextElementSibling;

      item.addEventListener('click', function (e) {
        e.preventDefault();

        ul.classList.toggle('expand');
        if (ul.classList.contains('expand')) {
          icon.className = 'fa fa-angle-down';
        } else {
          icon.className = 'fa fa-angle-right';
        }
      });

      var cCls = ul.querySelectorAll('.menu-item-active');
      if (cCls != null && cCls.length > 0) {
        item.click();
      }
    });
  },
  registerImageLoadEvent: function () {
    const images = document.querySelectorAll('.sidebar img, .post-block img, .vendors-list img');

    const callback = (entries) => {
      entries.forEach(item => {
        if (item.intersectionRatio > 0) {
          let ele = item.target;
          let imgSrc = ele.getAttribute('data-src');
          if (imgSrc) {
            let img = new Image();
            img.addEventListener('load', function () {
              ele.src = imgSrc;
            }, false);
            ele.src = imgSrc;
            // Prevent load image again
            ele.removeAttribute('data-src');
          }
        }
      })
    };

    const observer = new IntersectionObserver(callback);
    images.forEach(img => {
      observer.observe(img);
    });
  },

  registerImageViewer: function () {
    const post_body = document.querySelector('.post-body');
    if (post_body) {
      new Viewer(post_body, { navbar: 2, toolbar: 2 });
    }
  },

  registerToolButtons: function () {
    const buttons = document.querySelector('.tool-buttons');

    const scrollbar_buttons = buttons.querySelectorAll('div:not(#toggle-theme)');
    scrollbar_buttons.forEach(button => {
      let targetId = button.id;
      if (targetId != '') {
        targetId = targetId.substring(5);
      }
      button.addEventListener('click', () => {
        this.slidScrollBarAnime(targetId);
      });
    });

    buttons.querySelector('div#toggle-theme').addEventListener('click', () => {
      const cur_theme = document.documentElement.getAttribute('data-theme');
      window.theme.toggle(cur_theme === 'dark' ? 'light' : 'dark');
    });
  },

  slidScrollBarAnime: function (targetId, easing = 'linear', duration = 500) {
    const targetObj = document.getElementById(targetId);

    window.anime({
      targets: document.scrollingElement,
      duration: duration,
      easing: easing,
      scrollTop: targetId == '' || !targetObj ? 0 : targetObj.getBoundingClientRect().top + window.scrollY
    });
  },

  domAddClass: function (selector, cls) {
    const doms = document.querySelectorAll(selector);
    if (doms) {
      doms.forEach(dom => {
        dom.classList.add(cls);
      });
    }
  },

  fmtSiteInfo: function () {
    const runtimeCount = document.getElementById('runTimes');
    if (runtimeCount) {
      const publishDate = runtimeCount.getAttribute('data-publishDate');
      const runTimes = this.diffDate(publishDate, 2);
      runtimeCount.innerText = runTimes;
    }

    const wordsCount = document.getElementById('wordsCount');
    if (wordsCount) {
      const words = wordsCount.getAttribute('data-count');
      wordsCount.innerText = this.numberFormat(words);
    }

    const readTimes = document.getElementById('readTimes');
    if (readTimes) {
      const times = readTimes.getAttribute('data-times');

      const hour = 60;
      const day = hour * 24;

      const daysCount = parseInt(times / day);
      const hoursCount = parseInt(times / hour);

      let timesLabel;
      if (daysCount >= 1) {
        timesLabel = daysCount + NexT.CONFIG.i18n.ds_days + parseInt((times - daysCount * day) / hour) + NexT.CONFIG.i18n.ds_hours;
      } else if (hoursCount >= 1) {
        timesLabel = hoursCount + NexT.CONFIG.i18n.ds_hours + (times - hoursCount * hour) + NexT.CONFIG.i18n.ds_mins;
      } else {
        timesLabel = times + NexT.CONFIG.i18n.ds_mins;
      }

      readTimes.innerText = timesLabel;
    }

    const lastPushDate = document.getElementById('last-push-date');
    if (lastPushDate) {
      const pushDateVal = this.diffDate(lastPushDate.getAttribute('data-lastPushDate'), 1);
      lastPushDate.innerText = pushDateVal;
    }
  },

  fmtLaWidget: function () {
    setTimeout(function () {
      const laWidget = document.querySelectorAll('#la-siteinfo-widget span');
      if (laWidget.length > 0) {
        const valIds = [0, 2, 4, 6];
        const domIds = ['today_site_pv', 'yesterday_site_pv', 'month_site_pv', 'total_site_pv']
        for (let i in valIds) {
          let pv = NexT.utils.numberFormat(laWidget[valIds[i]].innerText);
          document.getElementById(domIds[i]).innerText = pv;
        }
      }
    }, 800);
  },

  fmtBusuanzi: function () {
    setTimeout(function () {
      const bszUV = document.getElementById('busuanzi_value_site_uv');
      if (bszUV) {
        bszUV.innerText = NexT.utils.numberFormat(bszUV.innerText);
      }
      const bszPV = document.getElementById('busuanzi_value_site_pv');
      if (bszPV) {
        bszPV.innerText = NexT.utils.numberFormat(bszPV.innerText);
      }
    }, 800);
  },

  numberFormat: function (number) {
    let result;
    if (number.indexOf(',') > 0) {
      number = number.replaceAll(",", "");
    }

    if (number > 10000) {
      result = (number / 10000.0).toFixed(2) + ' w';
    } else if (number > 1000) {
      result = (number / 1000.0).toFixed(2) + ' k';
    } else {
      result = number;
    }
    return result;
  },

  diffDate: function (date, mode = 0) {
    const dateNow = new Date();
    const datePost = new Date(date);
    const dateDiff = dateNow.getTime() - datePost.getTime();
    const minute = 1000 * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = month * 12;

    let result;
    if (mode == 1) {
      const monthCount = dateDiff / month;
      const dayCount = dateDiff / day;
      const hourCount = dateDiff / hour;
      const minuteCount = dateDiff / minute;

      if (monthCount > 12) {
        result = datePost.toLocaleDateString().replace(/\//g, '-');
      } else if (monthCount >= 1) {
        result = parseInt(monthCount) + NexT.CONFIG.i18n.ds_month;
      } else if (dayCount >= 1) {
        result = parseInt(dayCount) + NexT.CONFIG.i18n.ds_day;
      } else if (hourCount >= 1) {
        result = parseInt(hourCount) + NexT.CONFIG.i18n.ds_hour;
      } else if (minuteCount >= 1) {
        result = parseInt(minuteCount) + NexT.CONFIG.i18n.ds_min;
      } else {
        result = NexT.CONFIG.i18n.ds_just;
      }
    } else if (mode == 2) {
      const yearCount = parseInt(dateDiff / year);
      if (yearCount >= 1) {
        const dayCount = parseInt((dateDiff - (yearCount * year)) / day);
        result = yearCount + NexT.CONFIG.i18n.ds_years + dayCount + NexT.CONFIG.i18n.ds_days;
      } else {
        const dayCount = parseInt(dateDiff / day);
        result = dayCount + NexT.CONFIG.i18n.ds_days;
      }
    } else {
      result = parseInt(dateDiff / day);
    }

    return result;
  },

  checkDOMExist: function (selector) {
    return document.querySelector(selector) != null;
  },

  getCDNResource: function (res) {

    let router = NexT.CONFIG.vendor.router;
    let { name, version, file, alias, alias_name } = res;

    let res_src = '';

    switch (router.type) {
      case "modern":
        if (alias_name) name = alias_name;
        let alias_file = file.replace(/^(dist|lib|source|\/js|)\/(browser\/|)/, '');
        if (alias_file.indexOf('min') == -1) {
          alias_file = alias_file.replace(/\.js$/, '.min.js');
        }
        res_src = `${router.url}/${name}/${version}/${alias_file}`;
        break;
      default:
        if (alias) name = alias;
        res_src = `${router.url}/${name}@${version}/${file}`;
        break;
    }

    return res_src;
  },

  wrapTableWithBox: function () {
    document.querySelectorAll('table').forEach(element => {
      const box = document.createElement('div');
      box.className = 'table-container';
      element.wrap(box);
    });
  },

  registerVideoIframe: function () {
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

  registerScrollPercent: function () {
    const backToTop = document.querySelector('.back-to-top');
    const readingProgressBar = document.querySelector('.reading-progress-bar');
    // For init back to top in sidebar if page was scrolled after page refresh.
    window.addEventListener('scroll', () => {
      if (backToTop || readingProgressBar) {
        const contentHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = contentHeight > 0 ? Math.min(100 * window.scrollY / contentHeight, 100) : 0;
        if (backToTop) {
          const scrollPercentRound = Math.round(scrollPercent)
          const isShow = scrollPercentRound >= 5;
          backToTop.classList.toggle('back-to-top-on', isShow);
          backToTop.querySelector('span').innerText = scrollPercentRound + '%';
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
  },

  /**
   * Tabs tag listener (without twitter bootstrap).
   */
  registerTabsTag: function () {
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
          targets: document.scrollingElement,
          duration: 500,
          easing: 'linear',
          scrollTop: offset
        });
      });
    });

    window.dispatchEvent(new Event('tabs:register'));
  },

  registerCanIUseTag: function () {
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
  },*/
	
  registerLangSelect: function() {
    let selects = document.getElementById('lang-select');
    if (!selects) return;

    let selected = selects.querySelector('#lang-selected');
    let selectedVal = selected.querySelectorAll('span');
    let flagIcon = selectedVal[0];
    let langName = selectedVal[1];
    let selectIcon = selected.querySelector('i');
   

    let options = selects.querySelectorAll('#lang-options>div');
    let optionsDom = options[0].parentNode;
    options.forEach(option => {
      option.addEventListener('click', () => {
        let langCode = option.getAttribute('lang-code');
        flagIcon.className = 'flag-icon flag-icon-'+langCode;
        langName.innerHTML = option.getAttribute('lang-name');
        selectIcon.className = 'fa fa-chevron-down';
        optionsDom.style.opacity = '0';
        optionsDom.style.transform = 'translateY(-10px)';

        let url = option.getAttribute('lang-url');
        
        setTimeout(() => {
          optionsDom.style.display = 'none';
          window.location.href = url;
        }, 300);
      });
    }); 

    selected.addEventListener('mouseenter', function() {
      selectIcon.className = 'fa fa-chevron-up';
      optionsDom.style.display = 'block';
      optionsDom.style.opacity = '1';
      optionsDom.style.transform = 'translateY(0)';
      
    });

    optionsDom.addEventListener('mouseleave', function() {
      selectIcon.className = 'fa fa-chevron-down';
      optionsDom.style.opacity = '0';
      optionsDom.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        optionsDom.style.display = 'none';
      }, 300);
    });
    
  },

  registerSidebarTOC: function () {
    const toc = document.getElementById('TableOfContents');
    if (!toc.hasChildNodes()) {
      const tocActive = document.querySelector('.sidebar-inner');
      tocActive.classList.remove('sidebar-nav-active', 'sidebar-toc-active');
      tocActive.classList.add('sidebar-overview-active');
    }
    this.sections = [...document.querySelectorAll('.post-toc li a')].map(element => {
      const target = document.getElementById(decodeURI(element.getAttribute('href')).replace('#', ''));
      // TOC item animation navigate.
      element.addEventListener('click', event => {
        event.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY;
        window.anime({
          targets: document.scrollingElement,
          duration: 500,
          easing: 'linear',
          scrollTop: offset,
          complete: () => {
            history.pushState(null, document.title, element.href);
          }
        });
      });
      return target;
    });
  },

  registerPostReward: function () {
    const button = document.querySelector('.reward-container button');
    if (!button) return;
    button.addEventListener('click', () => {
      document.querySelector('.post-reward').classList.toggle('active');
    });
  },

  initCommontesDispaly: function () {
    const comms = document.querySelectorAll('.comment-wrap > div');
    if (comms.length <= 1) return;
    comms.forEach(function (item) {
      let dis = window.getComputedStyle(item, null).display;
      item.style.display = dis;
    });
  },

  registerCommonSwitch: function () {
    const button = document.querySelector('.comment-switch .switch-btn');
    if (!button) return;
    const comms = document.querySelectorAll('.comment-wrap > div');
    button.addEventListener('click', () => {
      button.classList.toggle('move');
      comms.forEach(function (item) {
        if (item.style.display === 'none') {
          item.style.cssText = "display: block; animation: tabshow .8s";
        } else {
          item.style.cssText = "display: none;"
        }
      });
    });
  },

  hiddeLodingCmp: function (selector) {
    const loadding = document.querySelector(selector).previousElementSibling;
    loadding.style.display = 'none';
  },

  activateNavByIndex: function (index) {
    const target = document.querySelectorAll('.post-toc li a')[index];
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
      targets: tocElement,
      duration: 200,
      easing: 'linear',
      scrollTop: tocElement.scrollTop - (tocElement.offsetHeight / 2) + target.getBoundingClientRect().top - tocElement.getBoundingClientRect().top
    });
  },

  updateSidebarPosition: function () {
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

  activateSidebarPanel: function (index) {
    const duration = 200;
    const sidebar = document.querySelector('.sidebar-inner');
    const panel = document.querySelector('.sidebar-panel-container');
    const activeClassName = ['sidebar-toc-active', 'sidebar-overview-active'];

    if (sidebar.classList.contains(activeClassName[index])) return;

    window.anime({
      duration,
      targets: panel,
      easing: 'linear',
      opacity: 0,
      translateY: [0, -20],
      complete: () => {
        // Prevent adding TOC to Overview if Overview was selected when close & open sidebar.
        sidebar.classList.replace(activeClassName[1 - index], activeClassName[index]);
        window.anime({
          duration,
          targets: panel,
          easing: 'linear',
          opacity: [0, 1],
          translateY: [-20, 0]
        });
      }
    });
  },

  getStyle: function (src, position = 'after', parent) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', src);

    const head = (parent || document.head);
    if (position === 'before') {
      head.prepend(link);
    } else {
      head.append(link);
    }
  },

  getScript: function (src, options = {}, legacyCondition) {
    if (typeof options === 'function') {
      return this.getScript(src, {
        condition: legacyCondition
      }).then(options);
    }

    const {
      condition = false,
      module = false,
      textContent = undefined,
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
        if (module) script.type = 'module';
        if (textContent != undefined) script.textContent = textContent;
        script.async = async;
        script.defer = defer;
        Object.assign(script.dataset, dataset);
        Object.entries(otherAttributes).forEach(([name, value]) => {
          script.setAttribute(name, String(value));
        });

        script.onload = resolve;
        script.onerror = reject;

        if (src != null && src != undefined) {
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
        }

        (parentNode || document.head).appendChild(script);
      }
    });
  },

  lazyLoadComponent: function (selector, legacyCallback) {
    if (legacyCallback) {
      return this.lazyLoadComponent(selector).then(legacyCallback);
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
/* boot startup */

(function () {
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

NexT.boot.registerEvents = function() {

  NexT.utils.registerMenuClick();
  NexT.utils.registerImageLoadEvent();
  NexT.utils.registerScrollPercent();
  // NexT.utils.registerCanIUseTag();
  NexT.utils.registerToolButtons();
  // Register comment's components
  NexT.plugins.register();

  // Register comment counter click event
  const commentCnt = document.querySelector('#comments-count');
  if (commentCnt && NexT.CONFIG.page.isPage) {
    commentCnt.addEventListener('click',  event => {
      NexT.utils.slidScrollBarAnime('comments');
    });
  }

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

  NexT.utils.fmtSiteInfo();
  NexT.utils.wrapTableWithBox();

  if (NexT.CONFIG.isMultiLang) {
    NexT.utils.registerLangSelect();
  }

  if (!NexT.CONFIG.page.isPage) return;
 
  if (NexT.CONFIG.page.toc) NexT.utils.registerSidebarTOC();
  if (NexT.CONFIG.page.expired) NexT.utils.calPostExpiredDate();
  if (NexT.CONFIG.page.music) NexT.utils.registerAPlayer();

  NexT.utils.registerImageViewer();
  NexT.utils.registerPostReward();

  if(NexT.CONFIG.page.comments) {    
    NexT.utils.initCommontesDispaly();
    NexT.utils.registerCommonSwitch();
    NexT.utils.domAddClass('#goto-comments', 'show');
  } else {
    NexT.utils.domAddClass('#goto-comments', 'hidden');
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
  NexT.utils.registerLangSelect();
  NexT.utils.wrapTableWithBox();
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

    animate(postblock, '.post-block, .flinks-block, .pagination, .post-comments');
    animate(collheader, '.collection-header');
    animate(postheader, '.post-header, .flinks-header');
    animate(postbody, '.post-body, .flinks-body');

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
/* Addtoany share plugin */
NexT.plugins.share.addtoany = function() {
  const element = '.a2a_kit';
  if (!NexT.CONFIG.share.enable || !NexT.utils.checkDOMExist(element)) return; 

  const addtoany = NexT.CONFIG.share.addtoany;

  if (!addtoany) return;

  NexT.utils.lazyLoadComponent(element, function() {
    let addtoany_cfg = `
      var a2a_config = a2a_config || {};
      a2a_config.onclick = 1;
      a2a_config.locale = "${addtoany.locale}";
      a2a_config.num_services = ${addtoany.num};
    `;

    NexT.utils.getScript(null, {
      textContent: addtoany_cfg
    });   
    
    NexT.utils.getScript(addtoany.js, () => { NexT.utils.hiddeLodingCmp(element); });
  });
}
;
/* Waline3 comment plugin */
NexT.plugins.comments.waline3 = function () {
  const element = '.waline3-container';
  if (!NexT.CONFIG.waline3
    || !NexT.utils.checkDOMExist(element)) return;
    
  const {
    emoji,
    search,
    imguploader,
    placeholder,
    sofa,
    requiredmeta,
    serverurl,
    wordlimit,
    reaction,
    reactiontext,
    reactiontitle
  } = NexT.CONFIG.waline3.cfg;

  const waline_js = NexT.utils.getCDNResource(NexT.CONFIG.waline3.js);

  NexT.utils.lazyLoadComponent(element, () => {
    
    const waline_css = NexT.utils.getCDNResource(NexT.CONFIG.waline3.css);
    NexT.utils.getStyle(waline_css, 'before');
   
    let waline_script = `
      let locale = {
        placeholder   : '${placeholder}',
        sofa          : '${sofa}',
        reactionTitle : '${reactiontitle}'
      };

      let recatt = ${JSON.stringify(reactiontext)}
      recatt.forEach(function(value, index){
        locale['reaction'+index] = value;
      });
    
      import('${waline_js}').then((Waline) => {
        Waline.init({
          locale,
          el            : '${element}',
          emoji         : ${emoji},
          search        : ${search},
          imageUploader : ${imguploader},
          wordLimit     : ${wordlimit},
          requiredMeta  : ${JSON.stringify(requiredmeta)},
          reaction      : ${reaction},
          serverURL     : '${serverurl}',
          dark          : 'html[data-theme="dark"]'
        });

        NexT.utils.hiddeLodingCmp('${element}');
      });
    `;
    
    NexT.utils.getScript(null, { module: true, textContent: waline_script });
  });
}
;
/* Page's view & comment counter plugin */
NexT.plugins.others.counter = function () {
  let pageview_js = undefined;
  let comment_js = undefined;

  const post_meta = NexT.CONFIG.postmeta;

  const views = post_meta.views;
  if (views != undefined && views.enable) {
    let pageview_el = '#pageview-count';

    switch (views.plugin) {
      case 'waline':
        pageview_js = NexT.utils.getCDNResource(NexT.CONFIG.page.waline.pagecnt);
        NexT.utils.getScript(pageview_js, function () {
          Waline.pageviewCount({
            selector : pageview_el,
            serverURL: NexT.CONFIG.waline.cfg.serverurl
          });
        });
        break;
      case 'waline3':
        pageview_js = NexT.utils.getCDNResource(NexT.CONFIG.page.waline3.pagecnt);

        let pageview_script = `
          import('${pageview_js}').then((Waline) => {
            Waline.pageviewCount({             
              selector : '${pageview_el}',
              serverURL: '${NexT.CONFIG.waline3.cfg.serverurl}'
            })
          });
          `;
        NexT.utils.getScript(null, { module: true, textContent: pageview_script });
        break;
    }

  }

  const comments = post_meta.comments;
  if (comments != undefined && comments.enable) {
    let comments_el = '#comments-count';
    switch (comments.plugin) {
      case 'waline':
        comment_js = NexT.utils.getCDNResource(NexT.CONFIG.page.waline.commentcnt);
        NexT.utils.getScript(comment_js, function () {
          Waline.commentCount({
            selector : comments_el,
            serverURL: NexT.CONFIG.waline.cfg.serverurl
          });
        });
        break;
      case 'waline3':
        comment_js = NexT.utils.getCDNResource(NexT.CONFIG.page.waline3.commentcnt);
        let comment_script = `
          import('${comment_js}').then((Waline) => {
            Waline.commentCount({             
              selector : '${comments_el}',
              serverURL: '${NexT.CONFIG.waline3.cfg.serverurl}'
            })
          });
          `;
        NexT.utils.getScript(null, { module: true, textContent: comment_script });
        break;
      case 'twikoo':
        comment_js = NexT.utils.getCDNResource(NexT.CONFIG.twikoo.js);
        NexT.utils.lazyLoadComponent("#twikoo", function () {
          NexT.utils.getScript(comment_js, function () {
            ele_list = document.querySelectorAll(comments_el);
            let paths = [];
            ele_list.forEach(ele => {
              paths.push(ele.getAttribute('data-path'));
            });
            twikoo.getCommentsCount({
              envId: NexT.CONFIG.twikoo.cfg.envid,
              region: NexT.CONFIG.twikoo.cfg.region ? NexT.CONFIG.twikoo.cfg.region : 'ap-shanghai',
              urls: paths,
              includeReply: true,
            }).then(function (res) {
              let count_map = {};
              res.forEach(item => {
                count_map[item.url] = item.count;
              });
              ele_list.forEach(ele => {
                ele.innerHTML = count_map[ele.getAttribute('data-path')];
              });
            }).catch(function (err) {
              console.error(err);
            });;
          });
        });
        break;
    }
  }
}
;
/* Giscus comment plugin */
NexT.plugins.comments.giscus = function() {
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


  NexT.utils.lazyLoadComponent(element, function() {
    NexT.utils.getScript(NexT.CONFIG.giscus.js, {
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
    });   
    
    NexT.utils.hiddeLodingCmp(element);
  });      
}
;
/* Algolia search engine */
NexT.plugins.search.algolia = function() {

  const algoliajs = NexT.utils.getCDNResource(NexT.CONFIG.algolia.js);
  const instantschjs = NexT.utils.getCDNResource(NexT.CONFIG.algolia.instantjs);

  NexT.utils.getScript(algoliajs);
  NexT.utils.getScript(instantschjs, function() {
    
    const { indexname, appid, apikey, hits } = NexT.CONFIG.algolia.cfg;
    const indexName = indexname;

    const search = instantsearch({
      indexName,
      searchClient: algoliasearch(appid, apikey),
      searchFunction: helper => {
        if (document.querySelector('.search-input').value) {
          helper.search();
        }
      }
    });

    const markKeyWords = function(content) {
      return content.replaceAll("<mark>", '<mark class="search-keyword">');
    };

    if (typeof pjax === 'object') {
      search.on('render', () => {
        pjax.refresh(document.querySelector('.algolia-hits'));
      });
    }

    // Registering Widgets
    search.addWidgets([
      instantsearch.widgets.configure({
        hitsPerPage: hits.perpage || 10
      }),

      instantsearch.widgets.searchBox({
        container: '.search-input-container',
        placeholder: NexT.CONFIG.i18n.placeholder,
        // Hide default icons of algolia search
        showReset: false,
        showSubmit: false,
        showLoadingIndicator: true,
        cssClasses: {
          input: 'search-input'
        }
      }),

      instantsearch.widgets.stats({
        container: '.algolia-stats',
        templates: {
          text: data => {
            const stats = NexT.CONFIG.i18n.hits_time
              .replace('${hits}', data.nbHits)
              .replace('${time}', data.processingTimeMS);
            return `${stats}`;
          }
        },
        cssClasses: {
          text: 'search-stats'
        }
      }),

      instantsearch.widgets.hits({
        container: '.algolia-hits',
        escapeHTML: true,
        templates: {
          item: data => {
            const { title, content } = data._highlightResult;
            let result = `<a href="${data.permalink}" class="search-result-title">${markKeyWords(title.value)}</a>`;
            //const content = excerpt || excerptStrip || content;
            if (content && content.value) {
              const div = document.createElement('div');
              div.innerHTML = markKeyWords(content.value);
              result += `<a href="${data.permalink}"><p class="search-result">${div.innerHTML.substring(0, 200)}...</p></a>`;
            }
            return result;
          },
          empty: data => {
            return `<div class="algolia-hits-empty">
              ${NexT.CONFIG.i18n.empty.replace('${query}', data.query)}
            </div>`;
          }
        },
        cssClasses: {
          list: 'search-result-list'
        }
      }),

      instantsearch.widgets.pagination({
        container: '.algolia-pagination',
        scrollTo: false,
        showFirst: true,
        showLast: true,
        templates: {
          first: '<i class="fa fa-angle-double-left"></i>',
          last: '<i class="fa fa-angle-double-right"></i>',
          previous: '<i class="fa fa-angle-left"></i>',
          next: '<i class="fa fa-angle-right"></i>'
        },
        cssClasses: {
          list: ['pagination', 'algolia-pagination'],
          item: 'pagination-item',
          link: 'page-number',
          selectedItem: 'current',
          disabledItem: 'disabled-item'
        }
      })
    ]);

    search.start();

    // Handle and trigger popup window
    document.querySelectorAll('.popup-trigger').forEach(element => {
      element.addEventListener('click', () => {
        document.body.classList.add('search-active');
        setTimeout(() => document.querySelector('.search-input').focus(), 500);
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
    document.addEventListener('pjax:success', onPopupClose);
    window.addEventListener('keyup', event => {
      if (event.key === 'Escape') {
        onPopupClose();
      }
    });
  });

}
;
/* 51La sidebar data widget */
NexT.plugins.others.lawidget = function() {

  if (!NexT.CONFIG.lawidget ) {
    return;
  }

  const element = '#siteinfo-card-widget';
  const lawt_js = NexT.CONFIG.lawidget.js.replace('laId', NexT.CONFIG.lawidget.id);
  
  NexT.utils.lazyLoadComponent(element, function () {    
    NexT.utils.getScript(lawt_js,{
      attributes: {
        id: 'LA-DATA-WIDGET',
        crossorigin: 'anonymous',
        charset: 'UTF-8',
        defer: true
      },
      parentNode: document.getElementById('la-siteinfo-widget')
    }, NexT.utils.fmtLaWidget());
  });
}