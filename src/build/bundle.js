
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var ui = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css = ":root{--blue:#18a0fb;--purple:#7b61ff;--hot-pink:#f0f;--green:#1bc47d;--red:#f24822;--yellow:#ffeb00;--black:#000;--black8:rgba(0,0,0,0.8);--black8-opaque:#333;--black3:rgba(0,0,0,0.3);--black3-opaque:#b3b3b3;--white:#fff;--white8:hsla(0,0%,100%,0.8);--white4:hsla(0,0%,100%,0.4);--grey:#f0f0f0;--silver:#e5e5e5;--hud:#222;--toolbar:#2c2c2c;--black1:rgba(0,0,0,0.1);--blue3:rgba(24,145,251,0.3);--purple4:rgba(123,97,255,0.4);--hover-fill:rgba(0,0,0,0.06);--selection-a:#daebf7;--selection-b:#edf5fa;--white2:hsla(0,0%,100%,0.2);--mp-y:#ffc700;--mp-g:#1bc47d;--mp-r:#ef5533;--mp-b:#18a0fb;--mp-p:#907cff;--mp-t:#00b5ce;--mp-s:#ee46d3;--font-stack:\"Inter\",sans-serif;--font-size-xsmall:11px;--font-size-small:12px;--font-size-large:13px;--font-size-xlarge:14px;--font-weight-normal:400;--font-weight-medium:500;--font-weight-bold:600;--font-line-height:16px;--font-line-height-large:24px;--font-letter-spacing-pos-small:.005em;--font-letter-spacing-neg-small:.01em;--font-letter-spacing-pos-medium:0;--font-letter-spacing-neg-medium:.005em;--font-letter-spacing-pos-large:-.0025em;--font-letter-spacing-neg-large:.0025em;--font-letter-spacing-pos-xlarge:-.001em;--font-letter-spacing-neg-xlarge:-.001em;--border-radius-small:2px;--border-radius-med:5px;--border-radius-large:6px;--shadow-hud:0 5px 17px rgba(0,0,0,0.2),0 2px 7px rgba(0,0,0,0.15);--shadow-floating-window:0 2px 14px rgba(0,0,0,0.15);--size-xxsmall:8px;--size-xsmall:16px;--size-small:24px;--size-medium:32px;--size-large:40px;--size-xlarge:48px;--size-xxlarge:64px;--size-huge:80px}*,body{box-sizing:border-box}body{position:relative;font-family:Inter,sans-serif;margin:0;padding:0}@font-face{font-family:Inter;font-weight:400;font-style:normal;src:url(https://rsms.me/inter/font-files/Inter-Regular.woff2?v=3.7) format(\"woff2\"),url(https://rsms.me/inter/font-files/Inter-Regular.woff?v=3.7) format(\"woff\")}@font-face{font-family:Inter;font-weight:500;font-style:normal;src:url(https://rsms.me/inter/font-files/Inter-Medium.woff2?v=3.7) format(\"woff2\"),url(https://rsms.me/inter/font-files/Inter-Medium.woff2?v=3.7) format(\"woff\")}@font-face{font-family:Inter;font-weight:600;font-style:normal;src:url(https://rsms.me/inter/font-files/Inter-SemiBold.woff2?v=3.7) format(\"woff2\"),url(https://rsms.me/inter/font-files/Inter-SemiBold.woff2?v=3.7) format(\"woff\")}.p-xxsmall{padding:var(--size-xxsmall)}.p-xsmall{padding:var(--size-xsmall)}.p-small{padding:var(--size-small)}.p-medium{padding:var(--size-medium)}.p-large{padding:var(--size-large)}.p-xlarge{padding:var(--size-xlarge)}.p-xxlarge{padding:var(--size-xxlarge)}.p-huge{padding:var(--size-huge)}.pt-xxsmall{padding-top:var(--size-xxsmall)}.pt-xsmall{padding-top:var(--size-xsmall)}.pt-small{padding-top:var(--size-small)}.pt-medium{padding-top:var(--size-medium)}.pt-large{padding-top:var(--size-large)}.pt-xlarge{padding-top:var(--size-xlarge)}.pt-xxlarge{padding-top:var(--size-xxlarge)}.pt-huge{padding-top:var(--size-huge)}.pr-xxsmall{padding-right:var(--size-xxsmall)}.pr-xsmall{padding-right:var(--size-xsmall)}.pr-small{padding-right:var(--size-small)}.pr-medium{padding-right:var(--size-medium)}.pr-large{padding-right:var(--size-large)}.pr-xlarge{padding-right:var(--size-xlarge)}.pr-xxlarge{padding-right:var(--size-xxlarge)}.pr-huge{padding-right:var(--size-huge)}.pb-xxsmall{padding-bottom:var(--size-xxsmall)}.pb-xsmall{padding-bottom:var(--size-xsmall)}.pb-small{padding-bottom:var(--size-small)}.pb-medium{padding-bottom:var(--size-medium)}.pb-large{padding-bottom:var(--size-large)}.pb-xlarge{padding-bottom:var(--size-xlarge)}.pb-xxlarge{padding-bottom:var(--size-xxlarge)}.pb-huge{padding-bottom:var(--size-huge)}.pl-xxsmall{padding-left:var(--size-xxsmall)}.pl-xsmall{padding-left:var(--size-xsmall)}.pl-small{padding-left:var(--size-small)}.pl-medium{padding-left:var(--size-medium)}.pl-large{padding-left:var(--size-large)}.pl-xlarge{padding-left:var(--size-xlarge)}.pl-xxlarge{padding-left:var(--size-xxlarge)}.pl-huge{padding-left:var(--size-huge)}.m-xxsmall{margin:var(--size-xxsmall)}.m-xsmall{margin:var(--size-xsmall)}.m-small{margin:var(--size-small)}.m-medium{margin:var(--size-medium)}.m-large{margin:var(--size-large)}.m-xlarge{margin:var(--size-xlarge)}.m-xxlarge{margin:var(--size-xxlarge)}.m-huge{margin:var(--size-huge)}.mt-xxsmall{margin-top:var(--size-xxsmall)}.mt-xsmall{margin-top:var(--size-xsmall)}.mt-small{margin-top:var(--size-small)}.mt-medium{margin-top:var(--size-medium)}.mt-large{margin-top:var(--size-large)}.mt-xlarge{margin-top:var(--size-xlarge)}.mt-xxlarge{margin-top:var(--size-xxlarge)}.mt-huge{margin-top:var(--size-huge)}.mr-xxsmall{margin-right:var(--size-xxsmall)}.mr-xsmall{margin-right:var(--size-xsmall)}.mr-small{margin-right:var(--size-small)}.mr-medium{margin-right:var(--size-medium)}.mr-large{margin-right:var(--size-large)}.mr-xlarge{margin-right:var(--size-xlarge)}.mr-xxlarge{margin-right:var(--size-xxlarge)}.mr-huge{margin-right:var(--size-huge)}.mb-xxsmall{margin-bottom:var(--size-xxsmall)}.mb-xsmall{margin-bottom:var(--size-xsmall)}.mb-small{margin-bottom:var(--size-small)}.mb-medium{margin-bottom:var(--size-medium)}.mb-large{margin-bottom:var(--size-large)}.mb-xlarge{margin-bottom:var(--size-xlarge)}.mb-xxlarge{margin-bottom:var(--size-xxlarge)}.mb-huge{margin-bottom:var(--size-huge)}.ml-xxsmall{margin-left:var(--size-xxsmall)}.ml-xsmall{margin-left:var(--size-xsmall)}.ml-small{margin-left:var(--size-small)}.ml-medium{margin-left:var(--size-medium)}.ml-large{margin-left:var(--size-large)}.ml-xlarge{margin-left:var(--size-xlarge)}.ml-xxlarge{margin-left:var(--size-xxlarge)}.ml-huge{margin-left:var(--size-huge)}.hidden{display:none}.flex{display:flex}.flexwrap{flex-wrap:wrap}.column{flex-direction:column}.row{flex-direction:row}";
    styleInject(css);

    /* node_modules/figma-plugin-ds-svelte/src/components/Button/index.svelte generated by Svelte v3.16.7 */

    const file = "node_modules/figma-plugin-ds-svelte/src/components/Button/index.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-rs1lk9-style";
    	style.textContent = "button.svelte-rs1lk9{background-color:var(--blue);border-radius:var(--border-radius-large);color:var(--white);display:inline-block;flex-shrink:0;font-family:var(--font-stack);font-size:var(--font-size-xsmall);font-weight:var(--font-weight-medium);letter-spacing:var(--font-letter-spacing-neg-medium);line-height:var(--font-line-height);height:var(--size-medium);padding:0 var(--size-xsmall) 0 var(--size-xsmall);text-decoration:none;outline:none;border:2px solid transparent;user-select:none}.primary.svelte-rs1lk9{background-color:var(--blue);color:var(--white)}.primary.svelte-rs1lk9:enabled:active,.primary.svelte-rs1lk9:enabled:focus{border:2px solid var(--black3)}.primary.svelte-rs1lk9:disabled{background-color:var(--black3)}.primary.destructive.svelte-rs1lk9{background-color:var(--red)}.primary.destructive.svelte-rs1lk9:disabled{opacity:0.4}.secondary.svelte-rs1lk9{background-color:var(--white);border:1px solid var(--black8);color:var(--black8);padding:0 calc(var(--size-xsmall) + 1px) 0 calc(var(--size-xsmall) + 1px);letter-spacing:var(--font-letter-spacing-pos-medium)}.secondary.svelte-rs1lk9:enabled:active,.secondary.svelte-rs1lk9:enabled:focus{border:2px solid var(--blue);padding:0 var(--size-xsmall) 0 var(--size-xsmall)}.secondary.svelte-rs1lk9:disabled{border:1px solid var(--black3);color:var(--black3)}.secondary.destructive.svelte-rs1lk9{border-color:var(--red);color:var(--red)}.secondary.destructive.svelte-rs1lk9:enabled:active,.secondary.destructive.svelte-rs1lk9:enabled:focus{border:2px solid var(--red);padding:0 var(--size-xsmall) 0 var(--size-xsmall)}.secondary.destructive.svelte-rs1lk9:disabled{opacity:0.4}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBsZXQgY2xhc3NOYW1lID0gJyc7XG5cbiAgICBleHBvcnQgbGV0IHByaW1hcnkgPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IHNlY29uZGFyeSA9IGZhbHNlO1xuICAgIGV4cG9ydCBsZXQgZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IGRlc3RydWN0aXZlID0gZmFsc2U7XG4gICAgZXhwb3J0IHsgY2xhc3NOYW1lIGFzIGNsYXNzIH07XG48L3NjcmlwdD5cblxuPGJ1dHRvblxuICAgIG9uOmNsaWNrXG4gICAgb246c3VibWl0XG4gICAgb25jbGljaz1cInRoaXMuYmx1cigpO1wiXG4gICAgY2xhc3M6cHJpbWFyeT17cHJpbWFyeX1cbiAgICBjbGFzczpzZWNvbmRhcnk9e3NlY29uZGFyeX1cbiAgICBjbGFzczpkZXN0cnVjdGl2ZT17ZGVzdHJ1Y3RpdmV9XG4gICAge2Rpc2FibGVkfVxuICAgIGNsYXNzPXtjbGFzc05hbWV9PlxuICAgIDxzbG90IC8+XG48L2J1dHRvbj5cblxuPHN0eWxlPlxuXG4gICAgYnV0dG9uIHtcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYmx1ZSk7XG4gICAgICAgIGJvcmRlci1yYWRpdXM6IHZhcigtLWJvcmRlci1yYWRpdXMtbGFyZ2UpO1xuICAgICAgICBjb2xvcjogdmFyKC0td2hpdGUpO1xuICAgICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgICAgIGZsZXgtc2hyaW5rOiAwO1xuICAgICAgICBmb250LWZhbWlseTogdmFyKC0tZm9udC1zdGFjayk7XG4gICAgICAgIGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLXhzbWFsbCk7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiB2YXIoLS1mb250LXdlaWdodC1tZWRpdW0pO1xuICAgICAgICBsZXR0ZXItc3BhY2luZzogdmFyKC0tZm9udC1sZXR0ZXItc3BhY2luZy1uZWctbWVkaXVtKTtcbiAgICAgICAgbGluZS1oZWlnaHQ6IHZhcigtLWZvbnQtbGluZS1oZWlnaHQpO1xuICAgICAgICBoZWlnaHQ6IHZhcigtLXNpemUtbWVkaXVtKTtcbiAgICAgICAgcGFkZGluZzogMCB2YXIoLS1zaXplLXhzbWFsbCkgMCB2YXIoLS1zaXplLXhzbWFsbCk7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAgICAgb3V0bGluZTogbm9uZTtcbiAgICAgICAgYm9yZGVyOiAycHggc29saWQgdHJhbnNwYXJlbnQ7XG4gICAgICAgIHVzZXItc2VsZWN0OiBub25lO1xuICAgIH1cblxuICAgIC8qIFByaW1hcnkgc3R5bGVzICovXG4gICAgLnByaW1hcnkge1xuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1ibHVlKTtcbiAgICAgICAgY29sb3I6IHZhcigtLXdoaXRlKTtcbiAgICB9XG4gICAgLnByaW1hcnk6ZW5hYmxlZDphY3RpdmUsIC5wcmltYXJ5OmVuYWJsZWQ6Zm9jdXMge1xuICAgICAgICBib3JkZXI6IDJweCBzb2xpZCB2YXIoLS1ibGFjazMpO1xuICAgIH1cbiAgICAucHJpbWFyeTpkaXNhYmxlZCB7XG4gICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLWJsYWNrMyk7XG4gICAgfVxuICAgIC5wcmltYXJ5LmRlc3RydWN0aXZlIHtcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tcmVkKTtcbiAgICB9XG4gICAgLnByaW1hcnkuZGVzdHJ1Y3RpdmU6ZGlzYWJsZWQge1xuICAgICAgICBvcGFjaXR5OiAwLjQ7XG4gICAgfVxuXG4gICAgLyogU2Vjb25kYXJ5IHN0eWxlcyAqL1xuICAgIC5zZWNvbmRhcnkge1xuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS13aGl0ZSk7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJsYWNrOCk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1ibGFjazgpO1xuICAgICAgICBwYWRkaW5nOiAwIGNhbGModmFyKC0tc2l6ZS14c21hbGwpICsgMXB4KSAwIGNhbGModmFyKC0tc2l6ZS14c21hbGwpICsgMXB4KTtcbiAgICAgICAgbGV0dGVyLXNwYWNpbmc6IHZhcigtLWZvbnQtbGV0dGVyLXNwYWNpbmctcG9zLW1lZGl1bSk7XG4gICAgfVxuICAgIC5zZWNvbmRhcnk6ZW5hYmxlZDphY3RpdmUsIC5zZWNvbmRhcnk6ZW5hYmxlZDpmb2N1cyB7XG4gICAgICAgIGJvcmRlcjogMnB4IHNvbGlkIHZhcigtLWJsdWUpO1xuICAgICAgICBwYWRkaW5nOiAwIHZhcigtLXNpemUteHNtYWxsKSAwIHZhcigtLXNpemUteHNtYWxsKTtcbiAgICB9XG4gICAgLnNlY29uZGFyeTpkaXNhYmxlZCB7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJsYWNrMyk7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1ibGFjazMpO1xuICAgIH1cbiAgICAuc2Vjb25kYXJ5LmRlc3RydWN0aXZlIHtcbiAgICAgICBib3JkZXItY29sb3I6IHZhcigtLXJlZCk7XG4gICAgICAgY29sb3I6IHZhcigtLXJlZCk7XG4gICAgfVxuICAgIC5zZWNvbmRhcnkuZGVzdHJ1Y3RpdmU6ZW5hYmxlZDphY3RpdmUsIC5zZWNvbmRhcnkuZGVzdHJ1Y3RpdmU6ZW5hYmxlZDpmb2N1cyB7XG4gICAgICAgYm9yZGVyOiAycHggc29saWQgdmFyKC0tcmVkKTtcbiAgICAgICAgcGFkZGluZzogMCB2YXIoLS1zaXplLXhzbWFsbCkgMCB2YXIoLS1zaXplLXhzbWFsbCk7XG4gICAgfVxuICAgIC5zZWNvbmRhcnkuZGVzdHJ1Y3RpdmU6ZGlzYWJsZWQge1xuICAgICAgICBvcGFjaXR5OiAwLjQ7XG4gICAgfVxuXG48L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF3QkksTUFBTSxjQUFDLENBQUMsQUFDSixnQkFBZ0IsQ0FBRSxJQUFJLE1BQU0sQ0FBQyxDQUM3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 */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let button;
    	let button_class_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "onclick", "this.blur();");
    			button.disabled = /*disabled*/ ctx[3];
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-rs1lk9"));
    			toggle_class(button, "primary", /*primary*/ ctx[1]);
    			toggle_class(button, "secondary", /*secondary*/ ctx[2]);
    			toggle_class(button, "destructive", /*destructive*/ ctx[4]);
    			add_location(button, file, 10, 0, 215);

    			dispose = [
    				listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false),
    				listen_dev(button, "submit", /*submit_handler*/ ctx[8], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    			}

    			if (!current || dirty & /*disabled*/ 8) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[3]);
    			}

    			if (!current || dirty & /*className*/ 1 && button_class_value !== (button_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-rs1lk9"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*className, primary*/ 3) {
    				toggle_class(button, "primary", /*primary*/ ctx[1]);
    			}

    			if (dirty & /*className, secondary*/ 5) {
    				toggle_class(button, "secondary", /*secondary*/ ctx[2]);
    			}

    			if (dirty & /*className, destructive*/ 17) {
    				toggle_class(button, "destructive", /*destructive*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { disabled = false } = $$props;
    	let { destructive = false } = $$props;
    	const writable_props = ["class", "primary", "secondary", "disabled", "destructive"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function submit_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("primary" in $$props) $$invalidate(1, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(2, secondary = $$props.secondary);
    		if ("disabled" in $$props) $$invalidate(3, disabled = $$props.disabled);
    		if ("destructive" in $$props) $$invalidate(4, destructive = $$props.destructive);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			className,
    			primary,
    			secondary,
    			disabled,
    			destructive
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("primary" in $$props) $$invalidate(1, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(2, secondary = $$props.secondary);
    		if ("disabled" in $$props) $$invalidate(3, disabled = $$props.disabled);
    		if ("destructive" in $$props) $$invalidate(4, destructive = $$props.destructive);
    	};

    	return [
    		className,
    		primary,
    		secondary,
    		disabled,
    		destructive,
    		$$scope,
    		$$slots,
    		click_handler,
    		submit_handler
    	];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-rs1lk9-style")) add_css();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			class: 0,
    			primary: 1,
    			secondary: 2,
    			disabled: 3,
    			destructive: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get class() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get primary() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set primary(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get secondary() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secondary(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get destructive() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set destructive(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/Icon/index.svelte generated by Svelte v3.16.7 */

    const file$1 = "node_modules/figma-plugin-ds-svelte/src/components/Icon/index.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1fwferi-style";
    	style.textContent = ".icon-component.svelte-1fwferi{display:flex;align-items:center;justify-content:center;cursor:default;width:var(--size-medium);height:var(--size-medium);font-family:var(--font-stack);font-size:var(--font-size-xsmall);user-select:none}.spin.svelte-1fwferi{animation:svelte-1fwferi-rotating 1.0s linear infinite}@keyframes svelte-1fwferi-rotating{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.icon-component *{fill:inherit;color:inherit}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBsZXQgY2xhc3NOYW1lID0gJyc7XG4gICAgXG4gICAgZXhwb3J0IGxldCBpY29uTmFtZSA9IG51bGw7IC8vcGFzcyBzdmcgZGF0YSBpbnRvIHRoaXMgdmFyIGJ5IGltcG9ydGluZyBhbiBzdmcgaW4gcGFyZW50XG4gICAgZXhwb3J0IGxldCBzcGluID0gZmFsc2U7XG4gICAgZXhwb3J0IGxldCBpY29uVGV4dCA9IG51bGw7XG4gICAgZXhwb3J0IGxldCBjb2xvciA9IFwiYmxhY2s4XCI7XG4gICAgZXhwb3J0IHsgY2xhc3NOYW1lIGFzIGNsYXNzIH07XG5cbjwvc2NyaXB0PlxuXG48ZGl2IFxuICAgIGNsYXNzOnNwaW49e3NwaW59XG4gICAge2ljb25UZXh0fVxuICAgIHtpY29uTmFtZX0gXG4gICAgY2xhc3M9XCJpY29uLWNvbXBvbmVudCB7Y2xhc3NOYW1lfVwiXG4gICAgc3R5bGU9XCJjb2xvcjogdmFyKC0te2NvbG9yfSk7IGZpbGw6IHZhcigtLXtjb2xvcn0pXCI+XG4gICAgeyNpZiBpY29uVGV4dH1cbiAgICAgICAge2ljb25UZXh0fVxuICAgIHs6ZWxzZX1cbiAgICAgICAge0BodG1sIGljb25OYW1lfVxuICAgIHsvaWZ9XG48L2Rpdj5cblxuPHN0eWxlPlxuXG4gICAgLmljb24tY29tcG9uZW50IHtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgICAgIGN1cnNvcjogZGVmYXVsdDtcbiAgICAgICAgd2lkdGg6IHZhcigtLXNpemUtbWVkaXVtKTtcbiAgICAgICAgaGVpZ2h0OiB2YXIoLS1zaXplLW1lZGl1bSk7XG4gICAgICAgIGZvbnQtZmFtaWx5OiB2YXIoLS1mb250LXN0YWNrKTtcbiAgICAgICAgZm9udC1zaXplOiB2YXIoLS1mb250LXNpemUteHNtYWxsKTtcbiAgICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgfVxuXG4gICAgLnNwaW4ge1xuICAgICAgICBhbmltYXRpb246IHJvdGF0aW5nIDEuMHMgbGluZWFyIGluZmluaXRlO1xuICAgIH1cblxuICAgIEBrZXlmcmFtZXMgcm90YXRpbmcge1xuICAgICAgICBmcm9tIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKDBkZWcpO1xuICAgICAgICB9XG4gICAgICAgIHRvIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICA6Z2xvYmFsKC5pY29uLWNvbXBvbmVudCAqKSB7XG4gICAgICAgIGZpbGw6IGluaGVyaXQ7XG4gICAgICAgIGNvbG9yOiBpbmhlcml0O1xuICAgIH1cblxuPC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBMEJJLGVBQWUsZUFBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxDQUNuQixlQUFlLENBQUUsTUFBTSxDQUN2QixNQUFNLENBQUUsT0FBTyxDQUNmLEtBQUssQ0FBRSxJQUFJLGFBQWEsQ0FBQyxDQUN6QixNQUFNLENBQUUsSUFBSSxhQUFhLENBQUMsQ0FDMUIsV0FBVyxDQUFFLElBQUksWUFBWSxDQUFDLENBQzlCLFNBQVMsQ0FBRSxJQUFJLGtCQUFrQixDQUFDLENBQ2xDLFdBQVcsQ0FBRSxJQUFJLEFBQ3JCLENBQUMsQUFFRCxLQUFLLGVBQUMsQ0FBQyxBQUNILFNBQVMsQ0FBRSx1QkFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxBQUM1QyxDQUFDLEFBRUQsV0FBVyx1QkFBUyxDQUFDLEFBQ2pCLElBQUksQUFBQyxDQUFDLEFBQ0YsU0FBUyxDQUFFLE9BQU8sSUFBSSxDQUFDLEFBQzNCLENBQUMsQUFDRCxFQUFFLEFBQUMsQ0FBQyxBQUNBLFNBQVMsQ0FBRSxPQUFPLE1BQU0sQ0FBQyxBQUM3QixDQUFDLEFBQ0wsQ0FBQyxBQUVPLGlCQUFpQixBQUFFLENBQUMsQUFDeEIsSUFBSSxDQUFFLE9BQU8sQ0FDYixLQUFLLENBQUUsT0FBTyxBQUNsQixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (20:4) {:else}
    function create_else_block(ctx) {
    	let html_tag;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(/*iconName*/ ctx[1], null);
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*iconName*/ 2) html_tag.p(/*iconName*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(20:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (18:4) {#if iconText}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*iconText*/ ctx[3]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*iconText*/ 8) set_data_dev(t, /*iconText*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(18:4) {#if iconText}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let div_class_value;

    	function select_block_type(ctx, dirty) {
    		if (/*iconText*/ ctx[3]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "icontext", /*iconText*/ ctx[3]);
    			attr_dev(div, "iconname", /*iconName*/ ctx[1]);
    			attr_dev(div, "class", div_class_value = "icon-component " + /*className*/ ctx[0] + " svelte-1fwferi");
    			set_style(div, "color", "var(--" + /*color*/ ctx[4] + ")");
    			set_style(div, "fill", "var(--" + /*color*/ ctx[4] + ")");
    			toggle_class(div, "spin", /*spin*/ ctx[2]);
    			add_location(div, file$1, 11, 0, 271);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty & /*iconText*/ 8) {
    				attr_dev(div, "icontext", /*iconText*/ ctx[3]);
    			}

    			if (dirty & /*iconName*/ 2) {
    				attr_dev(div, "iconname", /*iconName*/ ctx[1]);
    			}

    			if (dirty & /*className*/ 1 && div_class_value !== (div_class_value = "icon-component " + /*className*/ ctx[0] + " svelte-1fwferi")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*color*/ 16) {
    				set_style(div, "color", "var(--" + /*color*/ ctx[4] + ")");
    			}

    			if (dirty & /*color*/ 16) {
    				set_style(div, "fill", "var(--" + /*color*/ ctx[4] + ")");
    			}

    			if (dirty & /*className, spin*/ 5) {
    				toggle_class(div, "spin", /*spin*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { iconName = null } = $$props;
    	let { spin = false } = $$props;
    	let { iconText = null } = $$props;
    	let { color = "black8" } = $$props;
    	const writable_props = ["class", "iconName", "spin", "iconText", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("iconName" in $$props) $$invalidate(1, iconName = $$props.iconName);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("iconText" in $$props) $$invalidate(3, iconText = $$props.iconText);
    		if ("color" in $$props) $$invalidate(4, color = $$props.color);
    	};

    	$$self.$capture_state = () => {
    		return {
    			className,
    			iconName,
    			spin,
    			iconText,
    			color
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("iconName" in $$props) $$invalidate(1, iconName = $$props.iconName);
    		if ("spin" in $$props) $$invalidate(2, spin = $$props.spin);
    		if ("iconText" in $$props) $$invalidate(3, iconText = $$props.iconText);
    		if ("color" in $$props) $$invalidate(4, color = $$props.color);
    	};

    	return [className, iconName, spin, iconText, color];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1fwferi-style")) add_css$1();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			class: 0,
    			iconName: 1,
    			spin: 2,
    			iconText: 3,
    			color: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconName() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconName(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconText() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconText(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/Input/index.svelte generated by Svelte v3.16.7 */
    const file$2 = "node_modules/figma-plugin-ds-svelte/src/components/Input/index.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1o4owgs-style";
    	style.textContent = ".input.svelte-1o4owgs{position:relative}input.svelte-1o4owgs{font-size:var(--font-size-xsmall);font-weight:var(--font-weight-normal);letter-spacing:var( --font-letter-spacing-neg-small);line-height:var(--line-height);position:relative;display:flex;overflow:visible;align-items:center;width:100%;height:30px;margin:1px 0 1px 0;padding:7px 4px 9px 7px;color:var(--black8);border:1px solid transparent;border-radius:var(--border-radius-small);outline:none;background-color:var(--white)}input.svelte-1o4owgs:hover,input.svelte-1o4owgs:placeholder-shown:hover{color:var(--black8);border:1px solid var(--black1);background-image:none}input.svelte-1o4owgs::selection{color:var(--black);background-color:var(--blue3)}input.svelte-1o4owgs::placeholder{color:var(--black3);border:1px solid transparent}input.svelte-1o4owgs:placeholder-shown{border:1px solid transparent;background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcAAAAABCAYAAABJ5n7WAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgSURBVHgB7cMBCQAACMTAiR3sX1TQHr+DK2B+I0lSjj29qAEYlIbeBgAAAABJRU5ErkJggg==');background-repeat:no-repeat;background-position:center bottom -0.99px;background-size:calc(100% - 10px) 1px}input.svelte-1o4owgs:focus:placeholder-shown{border:1px solid var(--blue);outline:1px solid var(--blue);outline-offset:-2px}input.svelte-1o4owgs:disabled:hover{border:1px solid transparent}input.svelte-1o4owgs:active,input.svelte-1o4owgs:focus{padding:7px 4px 9px 7px;color:var(--black);border:1px solid var(--blue);outline:1px solid var(--blue);outline-offset:-2px}input.svelte-1o4owgs:disabled{position:relative;color:var(--black3);background-image:none}input.svelte-1o4owgs:disabled:active{padding:7px 4px 9px 7px;outline:none}.borders.svelte-1o4owgs{border:1px solid var(--black1);background-image:none}.borders.svelte-1o4owgs:disabled{border:1px solid transparent;background-image:none}.borders.svelte-1o4owgs:disabled:placeholder-shown{border:1px solid transparent;background-image:none}.borders.svelte-1o4owgs:disabled:placeholder-shown:active{border:1px solid transparent;outline:none}.borders.svelte-1o4owgs:placeholder-shown{border:1px solid var(--black1);background-image:none}.indent.svelte-1o4owgs{text-indent:24px}.icon.svelte-1o4owgs{position:absolute;top:-1px;left:0;width:var(--size-medium);height:var(--size-medium);z-index:1}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBpbXBvcnQgSWNvbiBmcm9tICcuLy4uL0ljb24vaW5kZXguc3ZlbHRlJztcblxuICAgIGV4cG9ydCBsZXQgaWQgPSBudWxsO1xuICAgIGV4cG9ydCBsZXQgdmFsdWUgPSAnJztcbiAgICBleHBvcnQgbGV0IG5hbWUgPSBudWxsO1xuICAgIGV4cG9ydCBsZXQgaWNvblRleHQgPSBudWxsO1xuICAgIGV4cG9ydCBsZXQgYm9yZGVycyA9IGZhbHNlO1xuICAgIGV4cG9ydCBsZXQgZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IGljb25OYW1lID0gbnVsbDtcbiAgICBleHBvcnQgbGV0IHNwaW4gPSBmYWxzZTtcbiAgICBleHBvcnQgbGV0IHBsYWNlaG9sZGVyID0gJ0lucHV0IHNvbWV0aGluZyBoZXJlLi4uJztcbiAgICBleHBvcnQgeyBjbGFzc05hbWUgYXMgY2xhc3MgfTtcblxuICAgIGxldCBjbGFzc05hbWUgPSAnJztcblxuPC9zY3JpcHQ+XG5cbnsjaWYgaWNvbk5hbWUgfHwgaWNvblRleHR9XG4gICAgPGRpdiBjbGFzcz1cImlucHV0IHtjbGFzc05hbWV9XCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpY29uXCI+XG4gICAgICAgICAgICA8SWNvbiB7aWNvbk5hbWV9IHtpY29uVGV4dH0ge3NwaW59IGNvbG9yPVwiYmxhY2szXCIvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGlucHV0IFxuICAgICAgICAgICAgdHlwZT1cImlucHV0XCJcbiAgICAgICAgICAgIGJpbmQ6dmFsdWU9e3ZhbHVlfVxuICAgICAgICAgICAge2lkfVxuICAgICAgICAgICAge25hbWV9XG4gICAgICAgICAgICB7ZGlzYWJsZWR9XG4gICAgICAgICAgICB7cGxhY2Vob2xkZXJ9XG4gICAgICAgICAgICBjbGFzcz1cImluZGVudFwiXG4gICAgICAgICAgICBjbGFzczpib3JkZXJzPXtib3JkZXJzfVxuICAgICAgICA+XG4gICAgPC9kaXY+XG57OmVsc2V9XG4gICAgPGRpdiBjbGFzcz1cImlucHV0IHtjbGFzc05hbWV9XCI+XG4gICAgICAgIDxpbnB1dCBcbiAgICAgICAgICAgIHR5cGU9XCJpbnB1dFwiXG4gICAgICAgICAgICBiaW5kOnZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICAgIHtpZH1cbiAgICAgICAgICAgIHtuYW1lfVxuICAgICAgICAgICAge2Rpc2FibGVkfVxuICAgICAgICAgICAge3BsYWNlaG9sZGVyfVxuICAgICAgICAgICAgY2xhc3M6Ym9yZGVycz17Ym9yZGVyc31cbiAgICAgICAgPlxuICAgIDwvZGl2Plxuey9pZn1cblxuPHN0eWxlPlxuXG4gICAgLmlucHV0IHtcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIH1cblxuICAgIGlucHV0IHtcbiAgICAgICAgZm9udC1zaXplOiB2YXIoLS1mb250LXNpemUteHNtYWxsKTtcbiAgICAgICAgZm9udC13ZWlnaHQ6IHZhcigtLWZvbnQtd2VpZ2h0LW5vcm1hbCk7XG4gICAgICAgIGxldHRlci1zcGFjaW5nOiB2YXIoIC0tZm9udC1sZXR0ZXItc3BhY2luZy1uZWctc21hbGwpO1xuICAgICAgICBsaW5lLWhlaWdodDogdmFyKC0tbGluZS1oZWlnaHQpO1xuICAgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICAgIG92ZXJmbG93OiB2aXNpYmxlO1xuICAgICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgICB3aWR0aDogMTAwJTtcbiAgICAgICAgaGVpZ2h0OiAzMHB4O1xuICAgICAgICBtYXJnaW46IDFweCAwIDFweCAwO1xuICAgICAgICBwYWRkaW5nOiA3cHggNHB4IDlweCA3cHg7XG4gICAgICAgIGNvbG9yOiB2YXIoLS1ibGFjazgpO1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cy1zbWFsbCk7XG4gICAgICAgIG91dGxpbmU6IG5vbmU7XG4gICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXdoaXRlKTtcbiAgICB9XG4gICAgaW5wdXQ6aG92ZXIsIGlucHV0OnBsYWNlaG9sZGVyLXNob3duOmhvdmVyIHtcblx0XHRjb2xvcjogdmFyKC0tYmxhY2s4KTtcblx0XHRib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ibGFjazEpO1xuICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xuXHR9XG5cdGlucHV0OjpzZWxlY3Rpb24ge1xuXHRcdGNvbG9yOiB2YXIoLS1ibGFjayk7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYmx1ZTMpO1xuXHR9XG5cdGlucHV0OjpwbGFjZWhvbGRlciB7XG5cdFx0Y29sb3I6IHZhcigtLWJsYWNrMyk7XG5cdFx0Ym9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XG5cdH1cblx0aW5wdXQ6cGxhY2Vob2xkZXItc2hvd24ge1xuXHRcdGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuXHRcdGJhY2tncm91bmQtaW1hZ2U6IHVybCgnZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFjQUFBQUFCQ0FZQUFBQko1bjdXQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFnU1VSQlZIZ0I3Y01CQ1FBQUNNVEFpUjNzWDFUUUhyK0RLMkIrSTBsU2pqMjlxQUVZbEliZUJnQUFBQUJKUlU1RXJrSmdnZz09Jyk7XG5cdFx0YmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcblx0XHRiYWNrZ3JvdW5kLXBvc2l0aW9uOiBjZW50ZXIgYm90dG9tIC0wLjk5cHg7XG5cdFx0YmFja2dyb3VuZC1zaXplOiBjYWxjKDEwMCUgLSAxMHB4KSAxcHg7XG5cdH1cbiAgICBpbnB1dDpmb2N1czpwbGFjZWhvbGRlci1zaG93biB7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJsdWUpO1xuICAgICAgICBvdXRsaW5lOiAxcHggc29saWQgdmFyKC0tYmx1ZSk7XG4gICAgICAgIG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xuICAgIH1cblx0aW5wdXQ6ZGlzYWJsZWQ6aG92ZXIge1xuXHRcdGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuXHR9XG5cdGlucHV0OmFjdGl2ZSwgaW5wdXQ6Zm9jdXMge1xuXHRcdHBhZGRpbmc6IDdweCA0cHggOXB4IDdweDtcblxuXHRcdGNvbG9yOiB2YXIoLS1ibGFjayk7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJsdWUpO1xuICAgICAgICBvdXRsaW5lOiAxcHggc29saWQgdmFyKC0tYmx1ZSk7XG4gICAgICAgIG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xuXHR9XG5cdGlucHV0OmRpc2FibGVkIHtcblx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdFx0Y29sb3I6IHZhcigtLWJsYWNrMyk7XG4gICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XG5cdH1cblx0aW5wdXQ6ZGlzYWJsZWQ6YWN0aXZlIHtcblx0XHRwYWRkaW5nOiA3cHggNHB4IDlweCA3cHg7XG4gICAgICAgIG91dGxpbmU6IG5vbmU7XG4gICAgfVxuXG4gICAgLmJvcmRlcnMge1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ibGFjazEpO1xuICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xuICAgIH1cbiAgICAuYm9yZGVyczpkaXNhYmxlZCB7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xuICAgIH1cbiAgICAuYm9yZGVyczpkaXNhYmxlZDpwbGFjZWhvbGRlci1zaG93biB7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xuICAgIH1cbiAgICAuYm9yZGVyczpkaXNhYmxlZDpwbGFjZWhvbGRlci1zaG93bjphY3RpdmUge1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICAgICAgb3V0bGluZTogbm9uZTtcbiAgICB9XG4gICAgLmJvcmRlcnM6cGxhY2Vob2xkZXItc2hvd24ge1xuICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ibGFjazEpO1xuICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xuICAgIH1cbiAgICBcbiAgICAuaW5kZW50IHtcbiAgICAgICAgdGV4dC1pbmRlbnQ6IDI0cHg7XG4gICAgfVxuXG4gICAgLmljb24ge1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG5cdFx0dG9wOiAtMXB4O1xuXHRcdGxlZnQ6IDA7XG4gICAgICAgIHdpZHRoOiB2YXIoLS1zaXplLW1lZGl1bSk7XG4gICAgICAgIGhlaWdodDogdmFyKC0tc2l6ZS1tZWRpdW0pO1xuICAgICAgICB6LWluZGV4OiAxO1xuICAgIH1cblxuPC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0RJLE1BQU0sZUFBQyxDQUFDLEFBQ0osUUFBUSxDQUFFLFFBQVEsQUFDdEIsQ0FBQyxBQUVELEtBQUssZUFBQyxDQUFDLEFBQ0gsU0FBUyxDQUFFLElBQUksa0JBQWtCLENBQUMsQ0FDbEMsV0FBVyxDQUFFLElBQUksb0JBQW9CLENBQUMsQ0FDdEMsY0FBYyxDQUFFLEtBQUssK0JBQStCLENBQUMsQ0FDckQsV0FBVyxDQUFFLElBQUksYUFBYSxDQUFDLENBQy9CLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsUUFBUSxDQUFFLE9BQU8sQ0FDakIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLE1BQU0sQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ25CLE9BQU8sQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQ3hCLEtBQUssQ0FBRSxJQUFJLFFBQVEsQ0FBQyxDQUNwQixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQzdCLGFBQWEsQ0FBRSxJQUFJLHFCQUFxQixDQUFDLENBQ3pDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZ0JBQWdCLENBQUUsSUFBSSxPQUFPLENBQUMsQUFDbEMsQ0FBQyxBQUNELG9CQUFLLE1BQU0sQ0FBRSxvQkFBSyxrQkFBa0IsTUFBTSxBQUFDLENBQUMsQUFDOUMsS0FBSyxDQUFFLElBQUksUUFBUSxDQUFDLENBQ3BCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQ3pCLGdCQUFnQixDQUFFLElBQUksQUFDN0IsQ0FBQyxBQUNELG9CQUFLLFdBQVcsQUFBQyxDQUFDLEFBQ2pCLEtBQUssQ0FBRSxJQUFJLE9BQU8sQ0FBQyxDQUNuQixnQkFBZ0IsQ0FBRSxJQUFJLE9BQU8sQ0FBQyxBQUMvQixDQUFDLEFBQ0Qsb0JBQUssYUFBYSxBQUFDLENBQUMsQUFDbkIsS0FBSyxDQUFFLElBQUksUUFBUSxDQUFDLENBQ3BCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQUFDOUIsQ0FBQyxBQUNELG9CQUFLLGtCQUFrQixBQUFDLENBQUMsQUFDeEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUM3QixnQkFBZ0IsQ0FBRSxJQUFJLG9OQUFvTixDQUFDLENBQzNPLGlCQUFpQixDQUFFLFNBQVMsQ0FDNUIsbUJBQW1CLENBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQzFDLGVBQWUsQ0FBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxBQUN2QyxDQUFDLEFBQ0Usb0JBQUssTUFBTSxrQkFBa0IsQUFBQyxDQUFDLEFBQzNCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLENBQzdCLE9BQU8sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLENBQzlCLGNBQWMsQ0FBRSxJQUFJLEFBQ3hCLENBQUMsQUFDSixvQkFBSyxTQUFTLE1BQU0sQUFBQyxDQUFDLEFBQ3JCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQUFDOUIsQ0FBQyxBQUNELG9CQUFLLE9BQU8sQ0FBRSxvQkFBSyxNQUFNLEFBQUMsQ0FBQyxBQUMxQixPQUFPLENBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUV4QixLQUFLLENBQUUsSUFBSSxPQUFPLENBQUMsQ0FDYixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUM3QixPQUFPLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUM5QixjQUFjLENBQUUsSUFBSSxBQUMzQixDQUFDLEFBQ0Qsb0JBQUssU0FBUyxBQUFDLENBQUMsQUFDZixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsSUFBSSxRQUFRLENBQUMsQ0FDZCxnQkFBZ0IsQ0FBRSxJQUFJLEFBQzdCLENBQUMsQUFDRCxvQkFBSyxTQUFTLE9BQU8sQUFBQyxDQUFDLEFBQ3RCLE9BQU8sQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLEFBQ2pCLENBQUMsQUFFRCxRQUFRLGVBQUMsQ0FBQyxBQUNOLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQy9CLGdCQUFnQixDQUFFLElBQUksQUFDMUIsQ0FBQyxBQUNELHVCQUFRLFNBQVMsQUFBQyxDQUFDLEFBQ2YsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUM3QixnQkFBZ0IsQ0FBRSxJQUFJLEFBQzFCLENBQUMsQUFDRCx1QkFBUSxTQUFTLGtCQUFrQixBQUFDLENBQUMsQUFDakMsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUM3QixnQkFBZ0IsQ0FBRSxJQUFJLEFBQzFCLENBQUMsQUFDRCx1QkFBUSxTQUFTLGtCQUFrQixPQUFPLEFBQUMsQ0FBQyxBQUN4QyxNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQzdCLE9BQU8sQ0FBRSxJQUFJLEFBQ2pCLENBQUMsQUFDRCx1QkFBUSxrQkFBa0IsQUFBQyxDQUFDLEFBQ3hCLE1BQU0sQ0FBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQy9CLGdCQUFnQixDQUFFLElBQUksQUFDMUIsQ0FBQyxBQUVELE9BQU8sZUFBQyxDQUFDLEFBQ0wsV0FBVyxDQUFFLElBQUksQUFDckIsQ0FBQyxBQUVELEtBQUssZUFBQyxDQUFDLEFBQ0gsUUFBUSxDQUFFLFFBQVEsQ0FDeEIsR0FBRyxDQUFFLElBQUksQ0FDVCxJQUFJLENBQUUsQ0FBQyxDQUNELEtBQUssQ0FBRSxJQUFJLGFBQWEsQ0FBQyxDQUN6QixNQUFNLENBQUUsSUFBSSxhQUFhLENBQUMsQ0FDMUIsT0FBTyxDQUFFLENBQUMsQUFDZCxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (35:0) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let input;
    	let div_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "type", "input");
    			attr_dev(input, "id", /*id*/ ctx[1]);
    			attr_dev(input, "name", /*name*/ ctx[2]);
    			input.disabled = /*disabled*/ ctx[5];
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			attr_dev(input, "class", "svelte-1o4owgs");
    			toggle_class(input, "borders", /*borders*/ ctx[4]);
    			add_location(input, file$2, 36, 8, 886);
    			attr_dev(div, "class", div_class_value = "input " + /*className*/ ctx[9] + " svelte-1o4owgs");
    			add_location(div, file$2, 35, 4, 846);
    			dispose = listen_dev(input, "input", /*input_input_handler_1*/ ctx[11]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[0]);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*id*/ 2) {
    				attr_dev(input, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*name*/ 4) {
    				attr_dev(input, "name", /*name*/ ctx[2]);
    			}

    			if (dirty & /*disabled*/ 32) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (dirty & /*placeholder*/ 256) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (dirty & /*borders*/ 16) {
    				toggle_class(input, "borders", /*borders*/ ctx[4]);
    			}

    			if (dirty & /*className*/ 512 && div_class_value !== (div_class_value = "input " + /*className*/ ctx[9] + " svelte-1o4owgs")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(35:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (19:0) {#if iconName || iconText}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let input;
    	let div1_class_value;
    	let current;
    	let dispose;

    	const icon = new Icon({
    			props: {
    				iconName: /*iconName*/ ctx[6],
    				iconText: /*iconText*/ ctx[3],
    				spin: /*spin*/ ctx[7],
    				color: "black3"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(icon.$$.fragment);
    			t = space();
    			input = element("input");
    			attr_dev(div0, "class", "icon svelte-1o4owgs");
    			add_location(div0, file$2, 20, 8, 495);
    			attr_dev(input, "type", "input");
    			attr_dev(input, "id", /*id*/ ctx[1]);
    			attr_dev(input, "name", /*name*/ ctx[2]);
    			input.disabled = /*disabled*/ ctx[5];
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			attr_dev(input, "class", "indent svelte-1o4owgs");
    			toggle_class(input, "borders", /*borders*/ ctx[4]);
    			add_location(input, file$2, 23, 8, 601);
    			attr_dev(div1, "class", div1_class_value = "input " + /*className*/ ctx[9] + " svelte-1o4owgs");
    			add_location(div1, file$2, 19, 4, 455);
    			dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[10]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(icon, div0, null);
    			append_dev(div1, t);
    			append_dev(div1, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*iconName*/ 64) icon_changes.iconName = /*iconName*/ ctx[6];
    			if (dirty & /*iconText*/ 8) icon_changes.iconText = /*iconText*/ ctx[3];
    			if (dirty & /*spin*/ 128) icon_changes.spin = /*spin*/ ctx[7];
    			icon.$set(icon_changes);

    			if (!current || dirty & /*id*/ 2) {
    				attr_dev(input, "id", /*id*/ ctx[1]);
    			}

    			if (!current || dirty & /*name*/ 4) {
    				attr_dev(input, "name", /*name*/ ctx[2]);
    			}

    			if (!current || dirty & /*disabled*/ 32) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (!current || dirty & /*placeholder*/ 256) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (dirty & /*borders*/ 16) {
    				toggle_class(input, "borders", /*borders*/ ctx[4]);
    			}

    			if (!current || dirty & /*className*/ 512 && div1_class_value !== (div1_class_value = "input " + /*className*/ ctx[9] + " svelte-1o4owgs")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(icon);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(19:0) {#if iconName || iconText}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*iconName*/ ctx[6] || /*iconText*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { id = null } = $$props;
    	let { value = "" } = $$props;
    	let { name = null } = $$props;
    	let { iconText = null } = $$props;
    	let { borders = false } = $$props;
    	let { disabled = false } = $$props;
    	let { iconName = null } = $$props;
    	let { spin = false } = $$props;
    	let { placeholder = "Input something here..." } = $$props;
    	let { class: className = "" } = $$props;

    	const writable_props = [
    		"id",
    		"value",
    		"name",
    		"iconText",
    		"borders",
    		"disabled",
    		"iconName",
    		"spin",
    		"placeholder",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_input_handler_1() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("iconText" in $$props) $$invalidate(3, iconText = $$props.iconText);
    		if ("borders" in $$props) $$invalidate(4, borders = $$props.borders);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ("iconName" in $$props) $$invalidate(6, iconName = $$props.iconName);
    		if ("spin" in $$props) $$invalidate(7, spin = $$props.spin);
    		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
    		if ("class" in $$props) $$invalidate(9, className = $$props.class);
    	};

    	$$self.$capture_state = () => {
    		return {
    			id,
    			value,
    			name,
    			iconText,
    			borders,
    			disabled,
    			iconName,
    			spin,
    			placeholder,
    			className
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("iconText" in $$props) $$invalidate(3, iconText = $$props.iconText);
    		if ("borders" in $$props) $$invalidate(4, borders = $$props.borders);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ("iconName" in $$props) $$invalidate(6, iconName = $$props.iconName);
    		if ("spin" in $$props) $$invalidate(7, spin = $$props.spin);
    		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
    		if ("className" in $$props) $$invalidate(9, className = $$props.className);
    	};

    	return [
    		value,
    		id,
    		name,
    		iconText,
    		borders,
    		disabled,
    		iconName,
    		spin,
    		placeholder,
    		className,
    		input_input_handler,
    		input_input_handler_1
    	];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1o4owgs-style")) add_css$2();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			id: 1,
    			value: 0,
    			name: 2,
    			iconText: 3,
    			borders: 4,
    			disabled: 5,
    			iconName: 6,
    			spin: 7,
    			placeholder: 8,
    			class: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get id() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconText() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconText(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get borders() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set borders(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconName() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconName(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/Label/index.svelte generated by Svelte v3.16.7 */

    const file$3 = "node_modules/figma-plugin-ds-svelte/src/components/Label/index.svelte";

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-dhnpf3-style";
    	style.textContent = "div.svelte-dhnpf3{font-size:var(--font-size-xsmall);font-weight:var(--font-weight-normal);letter-spacing:var( --font-letter-spacing-pos-small);line-height:var(--line-height);color:var(--black3);height:var(--size-medium);width:100%;display:flex;align-items:center;cursor:default;user-select:none;padding:0 calc(var(--size-xxsmall) / 2) 0 var(--size-xxsmall)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cblxuICAgIGxldCBjbGFzc05hbWUgPSAnJztcblxuPC9zY3JpcHQ+XG5cbjxkaXY+XG4gICAgPHNsb3Q+PC9zbG90PlxuPC9kaXY+XG5cbjxzdHlsZT5cblxuICAgIGRpdiB7XG4gICAgICAgIGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLXhzbWFsbCk7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiB2YXIoLS1mb250LXdlaWdodC1ub3JtYWwpO1xuICAgICAgICBsZXR0ZXItc3BhY2luZzogdmFyKCAtLWZvbnQtbGV0dGVyLXNwYWNpbmctcG9zLXNtYWxsKTtcbiAgICAgICAgbGluZS1oZWlnaHQ6IHZhcigtLWxpbmUtaGVpZ2h0KTtcbiAgICAgICAgY29sb3I6IHZhcigtLWJsYWNrMyk7XG4gICAgICAgIGhlaWdodDogdmFyKC0tc2l6ZS1tZWRpdW0pO1xuICAgICAgICB3aWR0aDogMTAwJTtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgY3Vyc29yOiBkZWZhdWx0O1xuICAgICAgICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgICAgICAgcGFkZGluZzogMCBjYWxjKHZhcigtLXNpemUteHhzbWFsbCkgLyAyKSAwIHZhcigtLXNpemUteHhzbWFsbCk7XG4gICAgfVxuXG48L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFZSSxHQUFHLGNBQUMsQ0FBQyxBQUNELFNBQVMsQ0FBRSxJQUFJLGtCQUFrQixDQUFDLENBQ2xDLFdBQVcsQ0FBRSxJQUFJLG9CQUFvQixDQUFDLENBQ3RDLGNBQWMsQ0FBRSxLQUFLLCtCQUErQixDQUFDLENBQ3JELFdBQVcsQ0FBRSxJQUFJLGFBQWEsQ0FBQyxDQUMvQixLQUFLLENBQUUsSUFBSSxRQUFRLENBQUMsQ0FDcEIsTUFBTSxDQUFFLElBQUksYUFBYSxDQUFDLENBQzFCLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxDQUNuQixNQUFNLENBQUUsT0FBTyxDQUNmLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLE9BQU8sQ0FBRSxDQUFDLENBQUMsS0FBSyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxjQUFjLENBQUMsQUFDbEUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$3(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "svelte-dhnpf3");
    			add_location(div, file$3, 6, 0, 46);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let className = "";
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) className = $$props.className;
    	};

    	return [className, $$scope, $$slots];
    }

    class Label extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-dhnpf3-style")) add_css$3();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Label",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/SelectDivider/index.svelte generated by Svelte v3.16.7 */

    const file$4 = "node_modules/figma-plugin-ds-svelte/src/components/SelectDivider/index.svelte";

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-14xwg33-style";
    	style.textContent = ".label.svelte-14xwg33{font-size:var(--font-size-small);font-weight:var(--font-weight-normal);letter-spacing:var( --font-letter-spacing-neg-medium);line-height:var(--line-height);display:flex;align-items:center;height:var(--size-small);margin-top:var(--size-xxsmall);padding:0 var(--size-xxsmall) 0 var(--size-medium);color:var(--white4)}.label.svelte-14xwg33:first-child{border-top:none;margin-top:0}.divider.svelte-14xwg33{background-color:var(--white2);display:block;height:1px;margin:8px 0 7px 0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBleHBvcnQgbGV0IGxhYmVsID0gZmFsc2U7XG48L3NjcmlwdD5cblxueyNpZiBsYWJlbD09PXRydWV9XG4gICAgPGxpIGNsYXNzPVwibGFiZWxcIj48c2xvdC8+PC9saT5cbns6ZWxzZX1cbiAgICA8bGkgY2xhc3M9XCJkaXZpZGVyXCI+PC9saT5cbnsvaWZ9XG5cbjxzdHlsZT5cblxuICAgIC5sYWJlbCB7XG4gICAgICAgIGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLXNtYWxsKTtcbiAgICAgICAgZm9udC13ZWlnaHQ6IHZhcigtLWZvbnQtd2VpZ2h0LW5vcm1hbCk7XG4gICAgICAgIGxldHRlci1zcGFjaW5nOiB2YXIoIC0tZm9udC1sZXR0ZXItc3BhY2luZy1uZWctbWVkaXVtKTtcbiAgICAgICAgbGluZS1oZWlnaHQ6IHZhcigtLWxpbmUtaGVpZ2h0KTtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcblx0XHRoZWlnaHQ6IHZhcigtLXNpemUtc21hbGwpO1xuXHRcdG1hcmdpbi10b3A6IHZhcigtLXNpemUteHhzbWFsbCk7XG5cdFx0cGFkZGluZzogMCB2YXIoLS1zaXplLXh4c21hbGwpIDAgdmFyKC0tc2l6ZS1tZWRpdW0pO1xuXHRcdGNvbG9yOiB2YXIoLS13aGl0ZTQpO1xuICAgIH1cbiAgICAubGFiZWw6Zmlyc3QtY2hpbGQge1xuICAgICAgICBib3JkZXItdG9wOiBub25lO1xuICAgICAgICBtYXJnaW4tdG9wOiAwO1xuICAgIH1cblxuICAgIC5kaXZpZGVyIHtcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0td2hpdGUyKTtcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XG5cdFx0aGVpZ2h0OiAxcHg7XG5cdFx0bWFyZ2luOiA4cHggMCA3cHggMDtcbiAgICB9XG5cbjwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVlJLE1BQU0sZUFBQyxDQUFDLEFBQ0osU0FBUyxDQUFFLElBQUksaUJBQWlCLENBQUMsQ0FDakMsV0FBVyxDQUFFLElBQUksb0JBQW9CLENBQUMsQ0FDdEMsY0FBYyxDQUFFLEtBQUssZ0NBQWdDLENBQUMsQ0FDdEQsV0FBVyxDQUFFLElBQUksYUFBYSxDQUFDLENBQy9CLE9BQU8sQ0FBRSxJQUFJLENBQ2IsV0FBVyxDQUFFLE1BQU0sQ0FDekIsTUFBTSxDQUFFLElBQUksWUFBWSxDQUFDLENBQ3pCLFVBQVUsQ0FBRSxJQUFJLGNBQWMsQ0FBQyxDQUMvQixPQUFPLENBQUUsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLENBQ25ELEtBQUssQ0FBRSxJQUFJLFFBQVEsQ0FBQyxBQUNsQixDQUFDLEFBQ0QscUJBQU0sWUFBWSxBQUFDLENBQUMsQUFDaEIsVUFBVSxDQUFFLElBQUksQ0FDaEIsVUFBVSxDQUFFLENBQUMsQUFDakIsQ0FBQyxBQUVELFFBQVEsZUFBQyxDQUFDLEFBQ04sZ0JBQWdCLENBQUUsSUFBSSxRQUFRLENBQUMsQ0FDL0IsT0FBTyxDQUFFLEtBQUssQ0FDcEIsTUFBTSxDQUFFLEdBQUcsQ0FDWCxNQUFNLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxBQUNqQixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (7:0) {:else}
    function create_else_block$2(ctx) {
    	let li;

    	const block = {
    		c: function create() {
    			li = element("li");
    			attr_dev(li, "class", "divider svelte-14xwg33");
    			add_location(li, file$4, 7, 4, 116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(7:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (5:0) {#if label===true}
    function create_if_block$2(ctx) {
    	let li;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			li = element("li");
    			if (default_slot) default_slot.c();
    			attr_dev(li, "class", "label svelte-14xwg33");
    			add_location(li, file$4, 5, 4, 73);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(5:0) {#if label===true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*label*/ ctx[0] === true) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { label = false } = $$props;
    	const writable_props = ["label"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SelectDivider> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { label };
    	};

    	$$self.$inject_state = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    	};

    	return [label, $$scope, $$slots];
    }

    class SelectDivider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-14xwg33-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { label: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectDivider",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get label() {
    		throw new Error("<SelectDivider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<SelectDivider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/SelectItem/index.svelte generated by Svelte v3.16.7 */

    const file$5 = "node_modules/figma-plugin-ds-svelte/src/components/SelectItem/index.svelte";

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-n672z0-style";
    	style.textContent = "li.svelte-n672z0{align-items:center;color:var(--white);cursor:default;display:flex;font-family:var(--font-stack);font-size:var(--font-size-small);font-weight:var(--font-weight-normal);letter-spacing:var(--font-letter-spacing-neg-small);line-height:var(--font-line-height);height:var(--size-small);padding:0px var(--size-xsmall) 0px var(--size-xxsmall);user-select:none;outline:none;transition-property:background-color;transition-duration:30ms}.label.svelte-n672z0{overflow-x:hidden;white-space:nowrap;text-overflow:ellipsis;pointer-events:none}.highlight.svelte-n672z0,li.svelte-n672z0:hover,li.svelte-n672z0:focus{background-color:var(--blue)}.icon.svelte-n672z0{width:var(--size-xsmall);height:var(--size-xsmall);margin-right:var(--size-xxsmall);opacity:0;pointer-events:none;background-image:url('data:image/svg+xml;utf8,%3Csvg%20fill%3D%22none%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20width%3D%2216%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m13.2069%205.20724-5.50002%205.49996-.70711.7072-.70711-.7072-3-2.99996%201.41422-1.41421%202.29289%202.29289%204.79293-4.79289z%22%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E');background-repeat:no-repeat;background-position:center center}.icon.selected.svelte-n672z0{opacity:1.0}.blink.svelte-n672z0,.blink.svelte-n672z0:hover{background-color:transparent}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBcbiAgICBsZXQgY2xhc3NOYW1lID0gJyc7XG4gICAgZXhwb3J0IGxldCBpdGVtSWQ7XG4gICAgZXhwb3J0IGxldCBzZWxlY3RlZCA9IGZhbHNlO1xuICAgIGV4cG9ydCB7IGNsYXNzTmFtZSBhcyBjbGFzcyB9O1xuXG48L3NjcmlwdD5cblxuPGxpIHtpdGVtSWR9IHRhYmluZGV4PXtpdGVtSWQrMX0gY2xhc3M6aGlnaGxpZ2h0PXtzZWxlY3RlZH0gY2xhc3M9e2NsYXNzTmFtZX0gb246bW91c2VlbnRlciBvbjpjbGljaz5cbiAgICA8ZGl2IGNsYXNzPVwiaWNvblwiIGNsYXNzOnNlbGVjdGVkPXtzZWxlY3RlZH0+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+PHNsb3QgLz48L2Rpdj5cbjwvbGk+XG5cbjxzdHlsZT5cblxuICAgIGxpIHtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgY29sb3I6IHZhcigtLXdoaXRlKTtcbiAgICAgICAgY3Vyc29yOiBkZWZhdWx0O1xuICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICBmb250LWZhbWlseTogdmFyKC0tZm9udC1zdGFjayk7XG4gICAgICAgIGZvbnQtc2l6ZTogdmFyKC0tZm9udC1zaXplLXNtYWxsKTtcbiAgICAgICAgZm9udC13ZWlnaHQ6IHZhcigtLWZvbnQtd2VpZ2h0LW5vcm1hbCk7XG4gICAgICAgIGxldHRlci1zcGFjaW5nOiB2YXIoLS1mb250LWxldHRlci1zcGFjaW5nLW5lZy1zbWFsbCk7XG4gICAgICAgIGxpbmUtaGVpZ2h0OiB2YXIoLS1mb250LWxpbmUtaGVpZ2h0KTtcbiAgICAgICAgaGVpZ2h0OiB2YXIoLS1zaXplLXNtYWxsKTtcbiAgICAgICAgcGFkZGluZzogMHB4IHZhcigtLXNpemUteHNtYWxsKSAwcHggdmFyKC0tc2l6ZS14eHNtYWxsKTtcbiAgICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgICAgIG91dGxpbmU6IG5vbmU7XG4gICAgICAgIHRyYW5zaXRpb24tcHJvcGVydHk6IGJhY2tncm91bmQtY29sb3I7XG4gICAgICAgIHRyYW5zaXRpb24tZHVyYXRpb246IDMwbXM7XG4gICAgfVxuXG4gICAgLmxhYmVsIHtcbiAgICAgICAgb3ZlcmZsb3cteDogaGlkZGVuO1xuICAgICAgICB3aGl0ZS1zcGFjZTogbm93cmFwOyBcbiAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cblxuICAgIC5oaWdobGlnaHQsIGxpOmhvdmVyLCBsaTpmb2N1cyB7XG4gICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLWJsdWUpO1xuICAgIH1cblxuICAgIC5pY29uIHtcbiAgICAgICAgd2lkdGg6IHZhcigtLXNpemUteHNtYWxsKTtcbiAgICAgICAgaGVpZ2h0OiB2YXIoLS1zaXplLXhzbWFsbCk7XG4gICAgICAgIG1hcmdpbi1yaWdodDogdmFyKC0tc2l6ZS14eHNtYWxsKTtcbiAgICAgICAgb3BhY2l0eTogMDtcbiAgICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybCgnZGF0YTppbWFnZS9zdmcreG1sO3V0ZjgsJTNDc3ZnJTIwZmlsbCUzRCUyMm5vbmUlMjIlMjBoZWlnaHQlM0QlMjIxNiUyMiUyMHZpZXdCb3glM0QlMjIwJTIwMCUyMDE2JTIwMTYlMjIlMjB3aWR0aCUzRCUyMjE2JTIyJTIweG1sbnMlM0QlMjJodHRwJTNBJTJGJTJGd3d3LnczLm9yZyUyRjIwMDAlMkZzdmclMjIlM0UlM0NwYXRoJTIwY2xpcC1ydWxlJTNEJTIyZXZlbm9kZCUyMiUyMGQlM0QlMjJtMTMuMjA2OSUyMDUuMjA3MjQtNS41MDAwMiUyMDUuNDk5OTYtLjcwNzExLjcwNzItLjcwNzExLS43MDcyLTMtMi45OTk5NiUyMDEuNDE0MjItMS40MTQyMSUyMDIuMjkyODklMjAyLjI5Mjg5JTIwNC43OTI5My00Ljc5Mjg5eiUyMiUyMGZpbGwlM0QlMjIlMjNmZmYlMjIlMjBmaWxsLXJ1bGUlM0QlMjJldmVub2RkJTIyJTJGJTNFJTNDJTJGc3ZnJTNFJyk7XG4gICAgICAgIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XG5cdFx0YmFja2dyb3VuZC1wb3NpdGlvbjogY2VudGVyIGNlbnRlcjtcbiAgICB9XG4gICAgLmljb24uc2VsZWN0ZWQge1xuICAgICAgICBvcGFjaXR5OiAxLjA7XG4gICAgfVxuXG4gICAgLmJsaW5rLCAuYmxpbms6aG92ZXIge1xuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcbiAgICB9XG5cbjwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlCSSxFQUFFLGNBQUMsQ0FBQyxBQUNBLFdBQVcsQ0FBRSxNQUFNLENBQ25CLEtBQUssQ0FBRSxJQUFJLE9BQU8sQ0FBQyxDQUNuQixNQUFNLENBQUUsT0FBTyxDQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsV0FBVyxDQUFFLElBQUksWUFBWSxDQUFDLENBQzlCLFNBQVMsQ0FBRSxJQUFJLGlCQUFpQixDQUFDLENBQ2pDLFdBQVcsQ0FBRSxJQUFJLG9CQUFvQixDQUFDLENBQ3RDLGNBQWMsQ0FBRSxJQUFJLCtCQUErQixDQUFDLENBQ3BELFdBQVcsQ0FBRSxJQUFJLGtCQUFrQixDQUFDLENBQ3BDLE1BQU0sQ0FBRSxJQUFJLFlBQVksQ0FBQyxDQUN6QixPQUFPLENBQUUsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLENBQ3ZELFdBQVcsQ0FBRSxJQUFJLENBQ2pCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsbUJBQW1CLENBQUUsZ0JBQWdCLENBQ3JDLG1CQUFtQixDQUFFLElBQUksQUFDN0IsQ0FBQyxBQUVELE1BQU0sY0FBQyxDQUFDLEFBQ0osVUFBVSxDQUFFLE1BQU0sQ0FDbEIsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsYUFBYSxDQUFFLFFBQVEsQ0FDdkIsY0FBYyxDQUFFLElBQUksQUFDeEIsQ0FBQyxBQUVELHdCQUFVLENBQUUsZ0JBQUUsTUFBTSxDQUFFLGdCQUFFLE1BQU0sQUFBQyxDQUFDLEFBQzVCLGdCQUFnQixDQUFFLElBQUksTUFBTSxDQUFDLEFBQ2pDLENBQUMsQUFFRCxLQUFLLGNBQUMsQ0FBQyxBQUNILEtBQUssQ0FBRSxJQUFJLGFBQWEsQ0FBQyxDQUN6QixNQUFNLENBQUUsSUFBSSxhQUFhLENBQUMsQ0FDMUIsWUFBWSxDQUFFLElBQUksY0FBYyxDQUFDLENBQ2pDLE9BQU8sQ0FBRSxDQUFDLENBQ1YsY0FBYyxDQUFFLElBQUksQ0FDcEIsZ0JBQWdCLENBQUUsSUFBSSx5YUFBeWEsQ0FBQyxDQUNoYyxpQkFBaUIsQ0FBRSxTQUFTLENBQ2xDLG1CQUFtQixDQUFFLE1BQU0sQ0FBQyxNQUFNLEFBQ2hDLENBQUMsQUFDRCxLQUFLLFNBQVMsY0FBQyxDQUFDLEFBQ1osT0FBTyxDQUFFLEdBQUcsQUFDaEIsQ0FBQyxBQUVELG9CQUFNLENBQUUsb0JBQU0sTUFBTSxBQUFDLENBQUMsQUFDbEIsZ0JBQWdCLENBQUUsV0FBVyxBQUNqQyxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let li;
    	let div0;
    	let t;
    	let div1;
    	let li_tabindex_value;
    	let li_class_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			li = element("li");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "icon svelte-n672z0");
    			toggle_class(div0, "selected", /*selected*/ ctx[2]);
    			add_location(div0, file$5, 10, 4, 247);
    			attr_dev(div1, "class", "label svelte-n672z0");
    			add_location(div1, file$5, 12, 4, 307);
    			attr_dev(li, "itemid", /*itemId*/ ctx[1]);
    			attr_dev(li, "tabindex", li_tabindex_value = /*itemId*/ ctx[1] + 1);
    			attr_dev(li, "class", li_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-n672z0"));
    			toggle_class(li, "highlight", /*selected*/ ctx[2]);
    			add_location(li, file$5, 9, 0, 141);

    			dispose = [
    				listen_dev(li, "mouseenter", /*mouseenter_handler*/ ctx[5], false, false, false),
    				listen_dev(li, "click", /*click_handler*/ ctx[6], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div0);
    			append_dev(li, t);
    			append_dev(li, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selected*/ 4) {
    				toggle_class(div0, "selected", /*selected*/ ctx[2]);
    			}

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    			}

    			if (!current || dirty & /*itemId*/ 2) {
    				attr_dev(li, "itemid", /*itemId*/ ctx[1]);
    			}

    			if (!current || dirty & /*itemId*/ 2 && li_tabindex_value !== (li_tabindex_value = /*itemId*/ ctx[1] + 1)) {
    				attr_dev(li, "tabindex", li_tabindex_value);
    			}

    			if (!current || dirty & /*className*/ 1 && li_class_value !== (li_class_value = "" + (null_to_empty(/*className*/ ctx[0]) + " svelte-n672z0"))) {
    				attr_dev(li, "class", li_class_value);
    			}

    			if (dirty & /*className, selected*/ 5) {
    				toggle_class(li, "highlight", /*selected*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { itemId } = $$props;
    	let { selected = false } = $$props;
    	const writable_props = ["class", "itemId", "selected"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SelectItem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, className = $$props.class);
    		if ("itemId" in $$props) $$invalidate(1, itemId = $$props.itemId);
    		if ("selected" in $$props) $$invalidate(2, selected = $$props.selected);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, itemId, selected };
    	};

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("itemId" in $$props) $$invalidate(1, itemId = $$props.itemId);
    		if ("selected" in $$props) $$invalidate(2, selected = $$props.selected);
    	};

    	return [
    		className,
    		itemId,
    		selected,
    		$$scope,
    		$$slots,
    		mouseenter_handler,
    		click_handler
    	];
    }

    class SelectItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-n672z0-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { class: 0, itemId: 1, selected: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectItem",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*itemId*/ ctx[1] === undefined && !("itemId" in props)) {
    			console.warn("<SelectItem> was created without expected prop 'itemId'");
    		}
    	}

    	get class() {
    		throw new Error("<SelectItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<SelectItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemId() {
    		throw new Error("<SelectItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemId(value) {
    		throw new Error("<SelectItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<SelectItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<SelectItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-click-outside/src/index.svelte generated by Svelte v3.16.7 */
    const file$6 = "node_modules/svelte-click-outside/src/index.svelte";

    function create_fragment$6(ctx) {
    	let t;
    	let div;
    	let current;
    	document.body.addEventListener("click", /*onClickOutside*/ ctx[1]);
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			t = space();
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$6, 31, 0, 549);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[7](div);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			document.body.removeEventListener("click", /*onClickOutside*/ ctx[1]);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[7](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { exclude = [] } = $$props;
    	let child;
    	const dispatch = createEventDispatcher();

    	function isExcluded(target) {
    		var parent = target;

    		while (parent) {
    			if (exclude.indexOf(parent) >= 0 || parent === child) {
    				return true;
    			}

    			parent = parent.parentNode;
    		}

    		return false;
    	}

    	function onClickOutside(event) {
    		if (!isExcluded(event.target)) {
    			dispatch("clickoutside");
    		}
    	}

    	const writable_props = ["exclude"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Src> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, child = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("exclude" in $$props) $$invalidate(2, exclude = $$props.exclude);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { exclude, child };
    	};

    	$$self.$inject_state = $$props => {
    		if ("exclude" in $$props) $$invalidate(2, exclude = $$props.exclude);
    		if ("child" in $$props) $$invalidate(0, child = $$props.child);
    	};

    	return [
    		child,
    		onClickOutside,
    		exclude,
    		dispatch,
    		isExcluded,
    		$$scope,
    		$$slots,
    		div_binding
    	];
    }

    class Src extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { exclude: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Src",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get exclude() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exclude(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/figma-plugin-ds-svelte/src/components/SelectMenu/index.svelte generated by Svelte v3.16.7 */

    const { document: document_1 } = globals;
    const file$7 = "node_modules/figma-plugin-ds-svelte/src/components/SelectMenu/index.svelte";

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-z4nbus-style";
    	style.textContent = ".wrapper.svelte-z4nbus.svelte-z4nbus{position:relative}button.svelte-z4nbus.svelte-z4nbus{display:flex;align-items:center;border:1px solid transparent;height:30px;width:100%;margin:1px 0 1px 0;padding:0px var(--size-xxsmall) 0px var(--size-xxsmall);overflow-y:hidden;border-radius:var(--border-radius-small)}button.svelte-z4nbus.svelte-z4nbus:hover{border-color:var(--black1)}button.svelte-z4nbus:hover .placeholder.svelte-z4nbus{color:var(--black8)}button.svelte-z4nbus:hover .caret svg path.svelte-z4nbus,button.svelte-z4nbus:focus .caret svg path.svelte-z4nbus{fill:var(--black8)}button.svelte-z4nbus:hover .caret.svelte-z4nbus,button.svelte-z4nbus:focus .caret.svelte-z4nbus{margin-left:auto}button.svelte-z4nbus.svelte-z4nbus:focus{border:1px solid var(--blue);outline:1px solid var(--blue);outline-offset:-2px}button.svelte-z4nbus:focus .placeholder.svelte-z4nbus{color:var(--black8)}button.svelte-z4nbus:disabled .label.svelte-z4nbus{color:var(--black3)}button.svelte-z4nbus.svelte-z4nbus:disabled:hover{justify-content:flex-start;border-color:transparent}button.svelte-z4nbus:disabled:hover .placeholder.svelte-z4nbus{color:var(--black3)}button.svelte-z4nbus:disabled:hover .caret svg path.svelte-z4nbus{fill:var(--black3)}button.svelte-z4nbus .svelte-z4nbus{pointer-events:none}.label.svelte-z4nbus.svelte-z4nbus,.placeholder.svelte-z4nbus.svelte-z4nbus{font-size:var(--font-size-xsmall);font-weight:var(--font-weight-normal);letter-spacing:var( --font-letter-spacing-neg-small);line-height:var(--line-height);color:var(--black8);margin-right:6px;margin-top:-3px;white-space:nowrap;overflow-x:hidden;text-overflow:ellipsis}.placeholder.svelte-z4nbus.svelte-z4nbus{color:var(--black3)}.caret.svelte-z4nbus.svelte-z4nbus{display:block;margin-top:-1px}.caret.svelte-z4nbus svg path.svelte-z4nbus{fill:var(--black3)}.icon.svelte-z4nbus.svelte-z4nbus{margin-left:-8px;margin-top:-2px;margin-right:0}.menu.svelte-z4nbus.svelte-z4nbus{position:absolute;top:32px;left:0;width:100%;background-color:var(--hud);box-shadow:var(--shadow-hud);padding:var(--size-xxsmall) 0 var(--size-xxsmall) 0;border-radius:var(--border-radius-small);margin:0;z-index:50;overflow-x:overlay;overflow-y:auto}.menu.svelte-z4nbus.svelte-z4nbus::-webkit-scrollbar{width:12px;background-color:transparent;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=);background-repeat:repeat;background-size:100% auto\n    }.menu.svelte-z4nbus.svelte-z4nbus::-webkit-scrollbar-track{border:solid 3px transparent;-webkit-box-shadow:inset 0 0 10px 10px transparent;box-shadow:inset 0 0 10px 10px transparent}.menu.svelte-z4nbus.svelte-z4nbus::-webkit-scrollbar-thumb{border:solid 3px transparent;border-radius:6px;-webkit-box-shadow:inset 0 0 10px 10px rgba(255,255,255,.4);box-shadow:inset 0 0 10px 10px rgba(255,255,255,.4)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcbiAgICBpbXBvcnQgeyBjcmVhdGVFdmVudERpc3BhdGNoZXIgfSBmcm9tICdzdmVsdGUnO1xuICAgIGltcG9ydCBDbGlja091dHNpZGUgZnJvbSAnc3ZlbHRlLWNsaWNrLW91dHNpZGUnO1xuICAgIGltcG9ydCBTZWxlY3RJdGVtIGZyb20gJy4vLi4vU2VsZWN0SXRlbS9pbmRleC5zdmVsdGUnO1xuICAgIGltcG9ydCBTZWxlY3REaXZpZGVyIGZyb20gJy4vLi4vU2VsZWN0RGl2aWRlci9pbmRleC5zdmVsdGUnO1xuICAgIGltcG9ydCBJY29uIGZyb20gJy4vLi4vSWNvbi9pbmRleC5zdmVsdGUnO1xuXG4gICAgZXhwb3J0IGxldCBpY29uTmFtZSA9IG51bGw7XG4gICAgZXhwb3J0IGxldCBpY29uVGV4dCA9IG51bGw7XG4gICAgZXhwb3J0IGxldCBpZCA9IG51bGw7XG4gICAgZXhwb3J0IGxldCBuYW1lID0nJztcbiAgICBleHBvcnQgbGV0IGRpc2FibGVkID0gZmFsc2U7XG4gICAgZXhwb3J0IGxldCBtYWNPU0JsaW5rID0gZmFsc2U7XG4gICAgZXhwb3J0IGxldCBtZW51SXRlbXMgPSBbXTsgLy9wYXNzIGRhdGEgaW4gdmlhIHRoaXMgcHJvcCB0byBnZW5lcmF0ZSBtZW51IGl0ZW1zXG4gICAgZXhwb3J0IGxldCBwbGFjZWhvbGRlciA9IFwiUGxlYXNlIG1ha2UgYSBzZWxlY3Rpb24uXCI7XG4gICAgZXhwb3J0IGxldCB2YWx1ZSA9IG51bGw7IC8vc3RvcmVzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiwgbm90ZSwgdGhlIHZhbHVlIHdpbGwgYmUgYW4gb2JqZWN0IGZyb20geW91ciBhcnJheVxuICAgIGV4cG9ydCBsZXQgc2hvd0dyb3VwTGFiZWxzID0gZmFsc2U7IC8vZGVmYXVsdCBwcm9wLCB0cnVlIHdpbGwgc2hvdyBvcHRpb24gZ3JvdXAgbGFiZWxzXG4gICAgZXhwb3J0IHsgY2xhc3NOYW1lIGFzIGNsYXNzIH07XG5cbiAgICBjb25zdCBkaXNwYXRjaCA9IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpO1xuICAgIC8vbGV0IHNjcm9sbDtcbiAgICBsZXQgY2xhc3NOYW1lID0gJyc7XG4gICAgbGV0IGdyb3VwcyA9IGNoZWNrR3JvdXBzKCk7XG4gICAgbGV0IG1lbnVXcmFwcGVyLCBtZW51QnV0dG9uLCBtZW51TGlzdDtcbiAgICAkOm1lbnVJdGVtcywgdXBkYXRlU2VsZWN0ZWRBbmRJZHMoKTtcblxuICAgIC8vRlVOQ1RJT05TXG5cbiAgICAvL3NldCBwbGFjZWhvbGRlclxuICAgIGlmIChtZW51SXRlbXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcGxhY2Vob2xkZXIgPSAnVGhlcmUgYXJlIG5vIGl0ZW1zIHRvIHNlbGVjdCc7XG4gICAgICAgIGRpc2FibGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvL2Fzc2lnbiBpZCdzIHRvIHRoZSBpbnB1dCBhcnJheVxuICAgIG9uTW91bnQoYXN5bmMgKCkgPT4ge1xuICAgICAgICB1cGRhdGVTZWxlY3RlZEFuZElkcygpO1xuICAgIH0pO1xuXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBydW5zIGV2ZXJ5dGltZSB0aGUgbWVudUl0ZW1zIGFycmF5IG9zIHVwZGF0ZWRcbiAgICAvLyBpdCB3aWxsIGF1dG8gYXNzaWduIGlkcyBhbmQga2VlcCB0aGUgdmFsdWUgdmFyIHVwZGF0ZWRcbiAgICBmdW5jdGlvbiB1cGRhdGVTZWxlY3RlZEFuZElkcygpIHtcbiAgICAgICAgbWVudUl0ZW1zLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvL3VwZGF0ZSBpZFxuICAgICAgICAgICAgaXRlbVsnaWQnXSA9IGluZGV4O1xuICAgICAgICAgICAgLy91cGRhdGUgc2VsZWN0aW9uXG4gICAgICAgICAgICBpZiAoaXRlbS5zZWxlY3RlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gIGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vZGV0ZXJtaW5lIGlmIG9wdGlvbiBncm91cHMgYXJlIHByZXNlbnRcbiAgICBmdW5jdGlvbiBjaGVja0dyb3VwcygpIHtcbiAgICAgICAgbGV0IGdyb3VwQ291bnQgPSAwO1xuICAgICAgICBpZiAobWVudUl0ZW1zKSB7XG4gICAgICAgICAgICBtZW51SXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5ncm91cCAhPSBudWxsKSB7IGdyb3VwQ291bnQrKzsgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZ3JvdXBDb3VudCA9PT0gbWVudUl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vbWVudSBoaWdobGlnaHQgZnVuY3Rpb24gb24gdGhlIHNlbGVjdGVkIG1lbnUgaXRlbVxuICAgIGZ1bmN0aW9uIHJlbW92ZUhpZ2hsaWdodChldmVudCkge1xuICAgICAgICBsZXQgaXRlbXMgPSBBcnJheS5mcm9tKGV2ZW50LnRhcmdldC5wYXJlbnROb2RlLmNoaWxkcmVuKTtcbiAgICAgICAgaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIGl0ZW0uYmx1cigpO1xuICAgICAgICAgICAgaXRlbS5jbGFzc0xpc3QucmVtb3ZlKCdoaWdobGlnaHQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy9ydW4gZm9yIGFsbCBtZW51IGNsaWNrIGV2ZW50c1xuICAgIC8vdGhpcyBvcGVucy9jbG9zZXMgdGhlIG1lbnVcbiAgICBmdW5jdGlvbiBtZW51Q2xpY2soZXZlbnQpIHtcblxuICAgICAgICByZXNldE1lbnVQcm9wZXJ0aWVzKCk7XG5cbiAgICAgICAgaWYgKCFldmVudC50YXJnZXQpIHtcbiAgICAgICAgICAgIG1lbnVMaXN0LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudGFyZ2V0LmNvbnRhaW5zKG1lbnVCdXR0b24pKSB7XG4gICAgICAgICAgICBsZXQgdG9wUG9zID0gMDtcblxuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy90b2dnbGUgbWVudVxuICAgICAgICAgICAgICAgIG1lbnVMaXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAgICAgbGV0IGlkID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkSXRlbSA9IG1lbnVMaXN0LnF1ZXJ5U2VsZWN0b3IoJ1tpdGVtSWQ9XCInK2lkKydcIl0nKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0uZm9jdXMoKTsgLy9zZXQgZm9jdXMgdG8gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBpdGVtXG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgZGlzdGFuY2UgZnJvbSB0b3Agc28gdGhhdCB3ZSBjYW4gcG9zaXRpb24gdGhlIGRyb3Bkb3duIG1lbnVcbiAgICAgICAgICAgICAgICBsZXQgcGFyZW50VG9wID0gbWVudUxpc3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgICAgICAgICAgICAgIGxldCBpdGVtVG9wID0gc2VsZWN0ZWRJdGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgICAgICBsZXQgdG9wUG9zID0gKGl0ZW1Ub3AgLSBwYXJlbnRUb3ApIC0gMztcbiAgICAgICAgICAgICAgICBtZW51TGlzdC5zdHlsZS50b3AgPSAtTWF0aC5hYnModG9wUG9zKSArICdweCc7XG4gICAgICAgICAgICAgICAgLy93aW5kb3cuc2Nyb2xsVG8oMCwgc2Nyb2xsKTtcblxuICAgICAgICAgICAgICAgIC8vdXBkYXRlIHNpemUgYW5kIHBvc2l0aW9uIGJhc2VkIG9uIHBsdWdpbiBVSVxuICAgICAgICAgICAgICAgIHJlc2l6ZUFuZFBvc2l0aW9uKCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWVudUxpc3QuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgbWVudUxpc3Quc3R5bGUudG9wID0gJzBweCc7XG4gICAgICAgICAgICAgICAgbGV0IGZpcnN0SXRlbSA9IG1lbnVMaXN0LnF1ZXJ5U2VsZWN0b3IoJ1tpdGVtSWQ9XCIwXCJdJyk7XG4gICAgICAgICAgICAgICAgZmlyc3RJdGVtLmZvY3VzKCk7XG5cbiAgICAgICAgICAgICAgICAvL3VwZGF0ZSBzaXplIGFuZCBwb3NpdGlvbiBiYXNlZCBvbiBwbHVnaW4gVUlcbiAgICAgICAgICAgICAgICByZXNpemVBbmRQb3NpdGlvbigpO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChtZW51TGlzdC5jb250YWlucyhldmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICAvL2ZpbmQgc2VsZWN0ZWQgaXRlbSBpbiBhcnJheVxuICAgICAgICAgICAgbGV0IGl0ZW1JZCA9IHBhcnNlSW50KGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2l0ZW1JZCcpKTsgXG5cbiAgICAgICAgICAgIC8vcmVtb3ZlIGN1cnJlbnQgc2VsZWN0aW9uIGlmIHRoZXJlIGlzIG9uZVxuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWVudUl0ZW1zW3ZhbHVlLmlkXS5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVudUl0ZW1zW2l0ZW1JZF0uc2VsZWN0ZWQgPSB0cnVlOyAvL3NlbGVjdCBjdXJyZW50IGl0ZW1cbiAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGVkQW5kSWRzKCk7XG4gICAgICAgICAgICBkaXNwYXRjaCgnY2hhbmdlJywgbWVudUl0ZW1zW2l0ZW1JZF0pO1xuXG4gICAgICAgICAgICBpZiAobWFjT1NCbGluaykge1xuICAgICAgICAgICAgICAgIHZhciB4ID0gNDtcbiAgICAgICAgICAgICAgICB2YXIgaW50ZXJ2YWwgPSA3MDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvL2JsaW5rIHRoZSBiYWNrZ3JvdW5kXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnYmxpbmsnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgaSAqIGludGVydmFsKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL2RlbGF5IGNsb3NpbmcgdGhlIG1lbnVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVudUxpc3QuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7IC8vaGlkZSB0aGUgbWVudVxuICAgICAgICAgICAgICAgIH0sIChpbnRlcnZhbCAqIHgpICsgNDApXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWVudUxpc3QuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7IC8vaGlkZSB0aGUgbWVudVxuICAgICAgICAgICAgICAgIG1lbnVCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSgnc2VsZWN0ZWQnKTsgLy9yZW1vdmUgc2VsZWN0ZWQgc3RhdGUgZnJvbSBidXR0b25cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRoaXMgZnVuY3Rpb24gZW5zdXJlcyB0aGF0IHRoZSBzZWxlY3QgbWVudVxuICAgIC8vIGZpdHMgaW5zaWRlIHRoZSBwbHVnaW4gdmlld3BvcnRcbiAgICAvLyBpZiBpdHMgdG9vIGJpZywgaXQgd2lsbCByZXNpemUgaXQgYW5kIGVuYWJsZSBhIHNjcm9sbGJhclxuICAgIC8vIGlmIGl0cyBvZmYgc2NyZWVuIGl0IHdpbGwgc2hpZnQgdGhlIHBvc2l0aW9uXG4gICAgZnVuY3Rpb24gcmVzaXplQW5kUG9zaXRpb24oKSB7XG5cbiAgICAgICAgLy9zZXQgdGhlIG1heCBoZWlnaHQgb2YgdGhlIG1lbnUgYmFzZWQgb24gcGx1Z2luL2lmcmFtZSB3aW5kb3dcbiAgICAgICAgbGV0IG1heE1lbnVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAxNjtcbiAgICAgICAgbGV0IG1lbnVIZWlnaHQgPSBtZW51TGlzdC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIGxldCBtZW51UmVzaXplZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChtZW51SGVpZ2h0ID4gbWF4TWVudUhlaWdodCkge1xuICAgICAgICAgICAgbWVudUxpc3Quc3R5bGUuaGVpZ2h0ID0gbWF4TWVudUhlaWdodCArICdweCc7XG4gICAgICAgICAgICBtZW51UmVzaXplZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvL2xldHMgYWRqdXN0IHRoZSBwb3NpdGlvbiBvZiB0aGUgbWVudSBpZiBpdHMgY3V0IG9mZiBmcm9tIHZpZXdwb3J0XG4gICAgICAgIHZhciBib3VuZGluZyA9IG1lbnVMaXN0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgcGFyZW50Qm91bmRpbmcgPSBtZW51QnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgdG9wTGltaXQgPSBwYXJlbnRCb3VuZGluZy50b3AgLSA4O1xuXG4gICAgICAgIGlmIChib3VuZGluZy50b3AgPCAwKSB7XG4gICAgICAgICAgICBtZW51TGlzdC5zdHlsZS50b3AgPSAtTWF0aC5hYnMocGFyZW50Qm91bmRpbmcudG9wIC0gOCkgKyAncHgnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib3VuZGluZy5ib3R0b20gPiAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpKSB7XG4gICAgICAgICAgICBsZXQgbWluVG9wID0gLU1hdGguYWJzKHBhcmVudEJvdW5kaW5nLnRvcCAtICh3aW5kb3cuaW5uZXJIZWlnaHQgLSBtZW51SGVpZ2h0IC0gOCkpO1xuICAgICAgICAgICAgbGV0IG5ld1RvcCA9IC1NYXRoLmFicyhib3VuZGluZy5ib3R0b20gLSB3aW5kb3cuaW5uZXJIZWlnaHQgKyAxNik7XG4gICAgICAgICAgICBpZiAobWVudVJlc2l6ZWQpIHtcbiAgICAgICAgICAgICAgICBtZW51TGlzdC5zdHlsZS50b3AgPSAtTWF0aC5hYnMocGFyZW50Qm91bmRpbmcudG9wIC0gOCkgKyAncHgnOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmV3VG9wID4gbWluVG9wKSB7XG4gICAgICAgICAgICAgICAgbWVudUxpc3Quc3R5bGUudG9wID0gbWluVG9wICsgJ3B4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIG1lbnVMaXN0LnN0eWxlLnRvcCA9IG5ld1RvcCArICdweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlc2V0TWVudVByb3BlcnRpZXMoKSB7XG4gICAgICAgIG1lbnVMaXN0LnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgbWVudUxpc3Quc3R5bGUudG9wID0gJzBweCc7XG4gICAgfVxuXG48L3NjcmlwdD5cblxuPENsaWNrT3V0c2lkZSBvbjpjbGlja291dHNpZGU9e21lbnVDbGlja30+XG4gICAgPGRpdiBcbiAgICAgICAgb246Y2hhbmdlXG4gICAgICAgIGJpbmQ6dGhpcz17bWVudVdyYXBwZXJ9XG4gICAgICAgIHtkaXNhYmxlZH1cbiAgICAgICAge3BsYWNlaG9sZGVyfVxuICAgICAgICB7c2hvd0dyb3VwTGFiZWxzfVxuICAgICAgICB7bWFjT1NCbGlua31cbiAgICAgICAgY2xhc3M9XCJ3cmFwcGVyIHtjbGFzc05hbWV9XCJcbiAgICAgICAgPlxuXG4gICAgICAgIDxidXR0b24gaWQ9e2lkfSBuYW1lPXtuYW1lfSBiaW5kOnRoaXM9e21lbnVCdXR0b259IG9uOmNsaWNrPXttZW51Q2xpY2t9IGRpc2FibGVkPXtkaXNhYmxlZH0+XG4gICAgICAgICAgICB7I2lmIGljb25OYW1lfVxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaWNvblwiPjxJY29uIGljb25OYW1lPXtpY29uTmFtZX0gY29sb3I9XCJibGFjazNcIi8+PC9zcGFuPlxuICAgICAgICAgICAgezplbHNlIGlmIGljb25UZXh0fVxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiaWNvblwiPjxJY29uIGljb25UZXh0PXtpY29uVGV4dH0gY29sb3I9XCJibGFjazNcIi8+PC9zcGFuPlxuICAgICAgICAgICAgey9pZn1cblxuICAgICAgICAgICAgeyNpZiB2YWx1ZX1cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+e3ZhbHVlLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgIHs6ZWxzZX1cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInBsYWNlaG9sZGVyXCI+e3BsYWNlaG9sZGVyfTwvc3Bhbj5cbiAgICAgICAgICAgIHsvaWZ9XG5cbiAgICAgICAgICAgIHsjaWYgIWRpc2FibGVkfVxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY2FyZXRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgdmlld0JveD1cIjAgMCA4IDhcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4gPHBhdGggZmlsbC1ydWxlPVwiZXZlbm9kZFwiIGNsaXAtcnVsZT1cImV2ZW5vZGRcIiBkPVwiTTMuNjQ2NDUgNS4zNTM1OUwwLjY0NjQ1NCAyLjM1MzU5TDEuMzUzNTYgMS42NDY0OEw0LjAwMDAxIDQuMjkyOTNMNi42NDY0NSAxLjY0NjQ4TDcuMzUzNTYgMi4zNTM1OUw0LjM1MzU2IDUuMzUzNTlMNC4wMDAwMSA1LjcwNzE0TDMuNjQ2NDUgNS4zNTM1OVpcIiBmaWxsPVwiYmxhY2tcIi8+IDwvc3ZnPlxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgIDx1bCBjbGFzcz1cIm1lbnUgaGlkZGVuXCIgYmluZDp0aGlzPXttZW51TGlzdH0+XG4gICAgICAgIHsjaWYgbWVudUl0ZW1zLmxlbmd0aCA+IDB9XG4gICAgICAgICAgICB7I2VhY2ggbWVudUl0ZW1zIGFzIGl0ZW0sIGl9XG4gICAgICAgICAgICAgICAgeyNpZiBpID09PSAwfVxuICAgICAgICAgICAgICAgICAgICB7I2lmIGl0ZW0uZ3JvdXAgJiYgc2hvd0dyb3VwTGFiZWxzfVxuICAgICAgICAgICAgICAgICAgICAgICAgPFNlbGVjdERpdmlkZXIgbGFiZWw+e2l0ZW0uZ3JvdXB9PC9TZWxlY3REaXZpZGVyPlxuICAgICAgICAgICAgICAgICAgICB7L2lmfVxuICAgICAgICAgICAgICAgIHs6ZWxzZSBpZiBpID4gMCAmJiBpdGVtLmdyb3VwICYmIG1lbnVJdGVtc1tpIC0gMV0uZ3JvdXAgIT0gaXRlbS5ncm91cH1cbiAgICAgICAgICAgICAgICAgICAgeyNpZiBzaG93R3JvdXBMYWJlbHN9XG4gICAgICAgICAgICAgICAgICAgICAgICA8U2VsZWN0RGl2aWRlciAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFNlbGVjdERpdmlkZXIgbGFiZWw+e2l0ZW0uZ3JvdXB9PC9TZWxlY3REaXZpZGVyPlxuICAgICAgICAgICAgICAgICAgICB7OmVsc2V9XG4gICAgICAgICAgICAgICAgICAgICAgICA8U2VsZWN0RGl2aWRlciAvPlxuICAgICAgICAgICAgICAgICAgICB7L2lmfVxuICAgICAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgICAgICAgPFNlbGVjdEl0ZW0gb246Y2xpY2s9e21lbnVDbGlja30gb246bW91c2VlbnRlcj17cmVtb3ZlSGlnaGxpZ2h0fSBpdGVtSWQ9e2l0ZW0uaWR9IGJpbmQ6c2VsZWN0ZWQ9e2l0ZW0uc2VsZWN0ZWR9PntpdGVtLmxhYmVsfTwvU2VsZWN0SXRlbT5cbiAgICAgICAgICAgIHsvZWFjaH1cbiAgICAgICAgey9pZn1cbiAgICAgICAgPC91bD5cbiAgICA8L2Rpdj5cbjwvQ2xpY2tPdXRzaWRlPlxuXG5cbjxzdHlsZT5cblxuICAgIC53cmFwcGVyIHtcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIH1cblxuICAgIGJ1dHRvbiB7XG4gICAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xuICAgICAgICBoZWlnaHQ6IDMwcHg7XG4gICAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgICBtYXJnaW46IDFweCAwIDFweCAwO1xuICAgICAgICBwYWRkaW5nOiAwcHggdmFyKC0tc2l6ZS14eHNtYWxsKSAwcHggdmFyKC0tc2l6ZS14eHNtYWxsKTsgICBcbiAgICAgICAgb3ZlcmZsb3cteTogaGlkZGVuO1xuICAgICAgICBib3JkZXItcmFkaXVzOiB2YXIoLS1ib3JkZXItcmFkaXVzLXNtYWxsKTtcbiAgICB9XG4gICAgYnV0dG9uOmhvdmVyIHtcbiAgICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ibGFjazEpO1xuICAgIH1cbiAgICBidXR0b246aG92ZXIgLnBsYWNlaG9sZGVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWJsYWNrOCk7XG4gICAgfVxuICAgIGJ1dHRvbjpob3ZlciAuY2FyZXQgc3ZnIHBhdGgsIGJ1dHRvbjpmb2N1cyAuY2FyZXQgc3ZnIHBhdGgge1xuICAgICAgICBmaWxsOiB2YXIoLS1ibGFjazgpO1xuICAgIH1cbiAgICBidXR0b246aG92ZXIgLmNhcmV0LCBidXR0b246Zm9jdXMgLmNhcmV0IHtcbiAgICAgICAgbWFyZ2luLWxlZnQ6IGF1dG87XG4gICAgfVxuICAgIGJ1dHRvbjpmb2N1cyB7XG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJsdWUpO1xuICAgICAgICBvdXRsaW5lOiAxcHggc29saWQgdmFyKC0tYmx1ZSk7XG4gICAgICAgIG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xuICAgIH1cbiAgICBidXR0b246Zm9jdXMgLnBsYWNlaG9sZGVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWJsYWNrOCk7XG4gICAgfVxuICAgIGJ1dHRvbjpkaXNhYmxlZCAubGFiZWwge1xuICAgICAgICBjb2xvcjogdmFyKC0tYmxhY2szKTtcbiAgICB9XG4gICAgYnV0dG9uOmRpc2FibGVkOmhvdmVyIHtcbiAgICAgICAganVzdGlmeS1jb250ZW50OiBmbGV4LXN0YXJ0O1xuICAgICAgICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIH1cbiAgICBidXR0b246ZGlzYWJsZWQ6aG92ZXIgLnBsYWNlaG9sZGVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWJsYWNrMyk7XG4gICAgfVxuICAgIGJ1dHRvbjpkaXNhYmxlZDpob3ZlciAuY2FyZXQgc3ZnIHBhdGgge1xuICAgICAgICBmaWxsOiB2YXIoLS1ibGFjazMpO1xuICAgIH1cbiAgICBidXR0b24gKiB7XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cblxuICAgIC5sYWJlbCwgLnBsYWNlaG9sZGVyIHtcbiAgICAgICAgZm9udC1zaXplOiB2YXIoLS1mb250LXNpemUteHNtYWxsKTtcbiAgICAgICAgZm9udC13ZWlnaHQ6IHZhcigtLWZvbnQtd2VpZ2h0LW5vcm1hbCk7XG4gICAgICAgIGxldHRlci1zcGFjaW5nOiB2YXIoIC0tZm9udC1sZXR0ZXItc3BhY2luZy1uZWctc21hbGwpO1xuICAgICAgICBsaW5lLWhlaWdodDogdmFyKC0tbGluZS1oZWlnaHQpO1xuICAgICAgICBjb2xvcjogdmFyKC0tYmxhY2s4KTtcbiAgICAgICAgbWFyZ2luLXJpZ2h0OiA2cHg7XG4gICAgICAgIG1hcmdpbi10b3A6IC0zcHg7XG4gICAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gICAgICAgIG92ZXJmbG93LXg6IGhpZGRlbjtcbiAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XG4gICAgfVxuXG4gICAgLnBsYWNlaG9sZGVyIHtcbiAgICAgICAgY29sb3I6IHZhcigtLWJsYWNrMyk7XG4gICAgfVxuXG4gICAgLmNhcmV0IHtcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XG4gICAgICAgIG1hcmdpbi10b3A6IC0xcHg7XG4gICAgfVxuXG4gICAgLmNhcmV0IHN2ZyBwYXRoIHtcbiAgICAgICAgZmlsbDogdmFyKC0tYmxhY2szKTtcbiAgICB9XG5cbiAgICAuaWNvbiB7XG4gICAgICAgIG1hcmdpbi1sZWZ0OiAtOHB4O1xuICAgICAgICBtYXJnaW4tdG9wOiAtMnB4O1xuICAgICAgICBtYXJnaW4tcmlnaHQ6IDA7XG4gICAgfVxuXG4gICAgLm1lbnUge1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgIHRvcDozMnB4O1xuICAgICAgICBsZWZ0OjA7XG4gICAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1odWQpO1xuICAgICAgICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctaHVkKTtcbiAgICAgICAgcGFkZGluZzogdmFyKC0tc2l6ZS14eHNtYWxsKSAwIHZhcigtLXNpemUteHhzbWFsbCkgMDtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogdmFyKC0tYm9yZGVyLXJhZGl1cy1zbWFsbCk7XG4gICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgei1pbmRleDogNTA7XG4gICAgICAgIG92ZXJmbG93LXg6IG92ZXJsYXk7XG4gICAgICAgIG92ZXJmbG93LXk6IGF1dG87XG4gICAgfVxuICAgIC5tZW51Ojotd2Via2l0LXNjcm9sbGJhcntcbiAgICAgICAgd2lkdGg6MTJweDtcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDtcbiAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQUVBQUFBQkNBUUFBQUMxSEF3Q0FBQUFDMGxFUVZSNDJtTmtZQUFBQUFZQUFqQ0IwQzhBQUFBQVNVVk9SSzVDWUlJPSk7XG4gICAgICAgIGJhY2tncm91bmQtcmVwZWF0OnJlcGVhdDtcbiAgICAgICAgYmFja2dyb3VuZC1zaXplOjEwMCUgYXV0b1xuICAgIH1cbiAgICAubWVudTo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2t7XG4gICAgICAgIGJvcmRlcjpzb2xpZCAzcHggdHJhbnNwYXJlbnQ7XG4gICAgICAgIC13ZWJraXQtYm94LXNoYWRvdzppbnNldCAwIDAgMTBweCAxMHB4IHRyYW5zcGFyZW50O1xuICAgICAgICBib3gtc2hhZG93Omluc2V0IDAgMCAxMHB4IDEwcHggdHJhbnNwYXJlbnQ7XG4gICAgfVxuICAgIC5tZW51Ojotd2Via2l0LXNjcm9sbGJhci10aHVtYntcbiAgICAgICAgYm9yZGVyOnNvbGlkIDNweCB0cmFuc3BhcmVudDtcbiAgICAgICAgYm9yZGVyLXJhZGl1czo2cHg7XG4gICAgICAgIC13ZWJraXQtYm94LXNoYWRvdzppbnNldCAwIDAgMTBweCAxMHB4IHJnYmEoMjU1LDI1NSwyNTUsLjQpO1xuICAgICAgICBib3gtc2hhZG93Omluc2V0IDAgMCAxMHB4IDEwcHggcmdiYSgyNTUsMjU1LDI1NSwuNCk7XG4gICAgfVxuICAgICAgICBcblxuPC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBOFBJLFFBQVEsNEJBQUMs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 */";
    	append_dev(document_1.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[27] = list;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (213:31) 
    function create_if_block_8(ctx) {
    	let span;
    	let current;

    	const icon = new Icon({
    			props: {
    				iconText: /*iconText*/ ctx[5],
    				color: "black3"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr_dev(span, "class", "icon svelte-z4nbus");
    			add_location(span, file$7, 213, 16, 7318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			mount_component(icon, span, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*iconText*/ 32) icon_changes.iconText = /*iconText*/ ctx[5];
    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			destroy_component(icon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(213:31) ",
    		ctx
    	});

    	return block;
    }

    // (211:12) {#if iconName}
    function create_if_block_7(ctx) {
    	let span;
    	let current;

    	const icon = new Icon({
    			props: {
    				iconName: /*iconName*/ ctx[4],
    				color: "black3"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr_dev(span, "class", "icon svelte-z4nbus");
    			add_location(span, file$7, 211, 16, 7201);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			mount_component(icon, span, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*iconName*/ 16) icon_changes.iconName = /*iconName*/ ctx[4];
    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			destroy_component(icon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(211:12) {#if iconName}",
    		ctx
    	});

    	return block;
    }

    // (219:12) {:else}
    function create_else_block_1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*placeholder*/ ctx[2]);
    			attr_dev(span, "class", "placeholder svelte-z4nbus");
    			add_location(span, file$7, 219, 16, 7523);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*placeholder*/ 4) set_data_dev(t, /*placeholder*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(219:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (217:12) {#if value}
    function create_if_block_6(ctx) {
    	let span;
    	let t_value = /*value*/ ctx[3].label + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "label svelte-z4nbus");
    			add_location(span, file$7, 217, 16, 7446);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value*/ 8 && t_value !== (t_value = /*value*/ ctx[3].label + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(217:12) {#if value}",
    		ctx
    	});

    	return block;
    }

    // (223:12) {#if !disabled}
    function create_if_block_5(ctx) {
    	let span;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			span = element("span");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "clip-rule", "evenodd");
    			attr_dev(path, "d", "M3.64645 5.35359L0.646454 2.35359L1.35356 1.64648L4.00001 4.29293L6.64645 1.64648L7.35356 2.35359L4.35356 5.35359L4.00001 5.70714L3.64645 5.35359Z");
    			attr_dev(path, "fill", "black");
    			attr_dev(path, "class", "svelte-z4nbus");
    			add_location(path, file$7, 224, 112, 7766);
    			attr_dev(svg, "width", "8");
    			attr_dev(svg, "height", "8");
    			attr_dev(svg, "viewBox", "0 0 8 8");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-z4nbus");
    			add_location(svg, file$7, 224, 20, 7674);
    			attr_dev(span, "class", "caret svelte-z4nbus");
    			add_location(span, file$7, 223, 16, 7633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, svg);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(223:12) {#if !disabled}",
    		ctx
    	});

    	return block;
    }

    // (231:8) {#if menuItems.length > 0}
    function create_if_block$3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*menuItems*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*menuItems, menuClick, removeHighlight, showGroupLabels*/ 16898) {
    				each_value = /*menuItems*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(231:8) {#if menuItems.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (237:86) 
    function create_if_block_3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_4, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type_3(ctx, dirty) {
    		if (/*showGroupLabels*/ ctx[9]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_3(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_3(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(237:86) ",
    		ctx
    	});

    	return block;
    }

    // (233:16) {#if i === 0}
    function create_if_block_1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*item*/ ctx[26].group && /*showGroupLabels*/ ctx[9] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*item*/ ctx[26].group && /*showGroupLabels*/ ctx[9]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(233:16) {#if i === 0}",
    		ctx
    	});

    	return block;
    }

    // (241:20) {:else}
    function create_else_block$3(ctx) {
    	let current;
    	const selectdivider = new SelectDivider({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(selectdivider.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectdivider, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectdivider.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectdivider.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectdivider, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(241:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (238:20) {#if showGroupLabels}
    function create_if_block_4(ctx) {
    	let t;
    	let current;
    	const selectdivider0 = new SelectDivider({ $$inline: true });

    	const selectdivider1 = new SelectDivider({
    			props: {
    				label: true,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(selectdivider0.$$.fragment);
    			t = space();
    			create_component(selectdivider1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectdivider0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(selectdivider1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const selectdivider1_changes = {};

    			if (dirty & /*$$scope, menuItems*/ 536870914) {
    				selectdivider1_changes.$$scope = { dirty, ctx };
    			}

    			selectdivider1.$set(selectdivider1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectdivider0.$$.fragment, local);
    			transition_in(selectdivider1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectdivider0.$$.fragment, local);
    			transition_out(selectdivider1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectdivider0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(selectdivider1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(238:20) {#if showGroupLabels}",
    		ctx
    	});

    	return block;
    }

    // (240:24) <SelectDivider label>
    function create_default_slot_3(ctx) {
    	let t_value = /*item*/ ctx[26].group + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*menuItems*/ 2 && t_value !== (t_value = /*item*/ ctx[26].group + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(240:24) <SelectDivider label>",
    		ctx
    	});

    	return block;
    }

    // (234:20) {#if item.group && showGroupLabels}
    function create_if_block_2(ctx) {
    	let current;

    	const selectdivider = new SelectDivider({
    			props: {
    				label: true,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(selectdivider.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectdivider, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const selectdivider_changes = {};

    			if (dirty & /*$$scope, menuItems*/ 536870914) {
    				selectdivider_changes.$$scope = { dirty, ctx };
    			}

    			selectdivider.$set(selectdivider_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectdivider.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectdivider.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectdivider, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(234:20) {#if item.group && showGroupLabels}",
    		ctx
    	});

    	return block;
    }

    // (235:24) <SelectDivider label>
    function create_default_slot_2(ctx) {
    	let t_value = /*item*/ ctx[26].group + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*menuItems*/ 2 && t_value !== (t_value = /*item*/ ctx[26].group + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(235:24) <SelectDivider label>",
    		ctx
    	});

    	return block;
    }

    // (245:16) <SelectItem on:click={menuClick} on:mouseenter={removeHighlight} itemId={item.id} bind:selected={item.selected}>
    function create_default_slot_1(ctx) {
    	let t_value = /*item*/ ctx[26].label + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*menuItems*/ 2 && t_value !== (t_value = /*item*/ ctx[26].label + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(245:16) <SelectItem on:click={menuClick} on:mouseenter={removeHighlight} itemId={item.id} bind:selected={item.selected}>",
    		ctx
    	});

    	return block;
    }

    // (232:12) {#each menuItems as item, i}
    function create_each_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let updating_selected;
    	let current;
    	const if_block_creators = [create_if_block_1, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*i*/ ctx[28] === 0) return 0;
    		if (/*i*/ ctx[28] > 0 && /*item*/ ctx[26].group && /*menuItems*/ ctx[1][/*i*/ ctx[28] - 1].group != /*item*/ ctx[26].group) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_2(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	function selectitem_selected_binding(value_1) {
    		/*selectitem_selected_binding*/ ctx[23].call(null, value_1, /*item*/ ctx[26]);
    	}

    	let selectitem_props = {
    		itemId: /*item*/ ctx[26].id,
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*item*/ ctx[26].selected !== void 0) {
    		selectitem_props.selected = /*item*/ ctx[26].selected;
    	}

    	const selectitem = new SelectItem({ props: selectitem_props, $$inline: true });
    	binding_callbacks.push(() => bind(selectitem, "selected", selectitem_selected_binding));
    	selectitem.$on("click", /*menuClick*/ ctx[14]);
    	selectitem.$on("mouseenter", removeHighlight);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			create_component(selectitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			mount_component(selectitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				} else {
    					if_block = null;
    				}
    			}

    			const selectitem_changes = {};
    			if (dirty & /*menuItems*/ 2) selectitem_changes.itemId = /*item*/ ctx[26].id;

    			if (dirty & /*$$scope, menuItems*/ 536870914) {
    				selectitem_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_selected && dirty & /*menuItems*/ 2) {
    				updating_selected = true;
    				selectitem_changes.selected = /*item*/ ctx[26].selected;
    				add_flush_callback(() => updating_selected = false);
    			}

    			selectitem.$set(selectitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(selectitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(selectitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(t);
    			destroy_component(selectitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(232:12) {#each menuItems as item, i}",
    		ctx
    	});

    	return block;
    }

    // (199:0) <ClickOutside on:clickoutside={menuClick}>
    function create_default_slot(ctx) {
    	let div;
    	let button;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let t2;
    	let ul;
    	let div_class_value;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block_7, create_if_block_8];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*iconName*/ ctx[4]) return 0;
    		if (/*iconText*/ ctx[5]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*value*/ ctx[3]) return create_if_block_6;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = !/*disabled*/ ctx[0] && create_if_block_5(ctx);
    	let if_block3 = /*menuItems*/ ctx[1].length > 0 && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			ul = element("ul");
    			if (if_block3) if_block3.c();
    			attr_dev(button, "id", /*id*/ ctx[6]);
    			attr_dev(button, "name", /*name*/ ctx[7]);
    			button.disabled = /*disabled*/ ctx[0];
    			attr_dev(button, "class", "svelte-z4nbus");
    			add_location(button, file$7, 209, 8, 7065);
    			attr_dev(ul, "class", "menu hidden svelte-z4nbus");
    			add_location(ul, file$7, 229, 8, 8054);
    			attr_dev(div, "disabled", /*disabled*/ ctx[0]);
    			attr_dev(div, "placeholder", /*placeholder*/ ctx[2]);
    			attr_dev(div, "showgrouplabels", /*showGroupLabels*/ ctx[9]);
    			attr_dev(div, "macosblink", /*macOSBlink*/ ctx[8]);
    			attr_dev(div, "class", div_class_value = "wrapper " + /*className*/ ctx[10] + " svelte-z4nbus");
    			add_location(div, file$7, 199, 4, 6866);

    			dispose = [
    				listen_dev(button, "click", /*menuClick*/ ctx[14], false, false, false),
    				listen_dev(div, "change", /*change_handler*/ ctx[21], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(button, null);
    			}

    			append_dev(button, t0);
    			if_block1.m(button, null);
    			append_dev(button, t1);
    			if (if_block2) if_block2.m(button, null);
    			/*button_binding*/ ctx[22](button);
    			append_dev(div, t2);
    			append_dev(div, ul);
    			if (if_block3) if_block3.m(ul, null);
    			/*ul_binding*/ ctx[24](ul);
    			/*div_binding*/ ctx[25](div);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block0) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];

    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					}

    					transition_in(if_block0, 1);
    					if_block0.m(button, t0);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(button, t1);
    				}
    			}

    			if (!/*disabled*/ ctx[0]) {
    				if (!if_block2) {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(button, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty & /*id*/ 64) {
    				attr_dev(button, "id", /*id*/ ctx[6]);
    			}

    			if (!current || dirty & /*name*/ 128) {
    				attr_dev(button, "name", /*name*/ ctx[7]);
    			}

    			if (!current || dirty & /*disabled*/ 1) {
    				prop_dev(button, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (/*menuItems*/ ctx[1].length > 0) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    					transition_in(if_block3, 1);
    				} else {
    					if_block3 = create_if_block$3(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(ul, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*disabled*/ 1) {
    				attr_dev(div, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty & /*placeholder*/ 4) {
    				attr_dev(div, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (!current || dirty & /*showGroupLabels*/ 512) {
    				attr_dev(div, "showgrouplabels", /*showGroupLabels*/ ctx[9]);
    			}

    			if (!current || dirty & /*macOSBlink*/ 256) {
    				attr_dev(div, "macosblink", /*macOSBlink*/ ctx[8]);
    			}

    			if (!current || dirty & /*className*/ 1024 && div_class_value !== (div_class_value = "wrapper " + /*className*/ ctx[10] + " svelte-z4nbus")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if_block1.d();
    			if (if_block2) if_block2.d();
    			/*button_binding*/ ctx[22](null);
    			if (if_block3) if_block3.d();
    			/*ul_binding*/ ctx[24](null);
    			/*div_binding*/ ctx[25](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(199:0) <ClickOutside on:clickoutside={menuClick}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current;

    	const clickoutside = new Src({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	clickoutside.$on("clickoutside", /*menuClick*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(clickoutside.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(clickoutside, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const clickoutside_changes = {};

    			if (dirty & /*$$scope, disabled, placeholder, showGroupLabels, macOSBlink, className, menuWrapper, menuList, menuItems, id, name, menuButton, value, iconName, iconText*/ 536887295) {
    				clickoutside_changes.$$scope = { dirty, ctx };
    			}

    			clickoutside.$set(clickoutside_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(clickoutside.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(clickoutside.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(clickoutside, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function removeHighlight(event) {
    	let items = Array.from(event.target.parentNode.children);

    	items.forEach(item => {
    		item.blur();
    		item.classList.remove("highlight");
    	});
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { iconName = null } = $$props;
    	let { iconText = null } = $$props;
    	let { id = null } = $$props;
    	let { name = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { macOSBlink = false } = $$props;
    	let { menuItems = [] } = $$props;
    	let { placeholder = "Please make a selection." } = $$props;
    	let { value = null } = $$props;
    	let { showGroupLabels = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let { class: className = "" } = $$props;
    	let groups = checkGroups();
    	let menuWrapper, menuButton, menuList;

    	if (menuItems.length <= 0) {
    		placeholder = "There are no items to select";
    		disabled = true;
    	}

    	onMount(async () => {
    		updateSelectedAndIds();
    	});

    	function updateSelectedAndIds() {
    		menuItems.forEach((item, index) => {
    			item["id"] = index;

    			if (item.selected === true) {
    				$$invalidate(3, value = item);
    			}
    		});
    	}

    	function checkGroups() {
    		let groupCount = 0;

    		if (menuItems) {
    			menuItems.forEach(item => {
    				if (item.group != null) {
    					groupCount++;
    				}
    			});

    			if (groupCount === menuItems.length) {
    				return true;
    			} else {
    				return false;
    			}
    		}

    		return false;
    	}

    	function menuClick(event) {
    		resetMenuProperties();

    		if (!event.target) {
    			menuList.classList.add("hidden");
    		} else if (event.target.contains(menuButton)) {

    			if (value) {
    				menuList.classList.remove("hidden");
    				let id = value.id;
    				let selectedItem = menuList.querySelector("[itemId=\"" + id + "\"]");
    				selectedItem.focus();
    				let parentTop = menuList.getBoundingClientRect().top;
    				let itemTop = selectedItem.getBoundingClientRect().top;
    				let topPos = itemTop - parentTop - 3;
    				$$invalidate(13, menuList.style.top = -Math.abs(topPos) + "px", menuList);
    				resizeAndPosition();
    			} else {
    				menuList.classList.remove("hidden");
    				$$invalidate(13, menuList.style.top = "0px", menuList);
    				let firstItem = menuList.querySelector("[itemId=\"0\"]");
    				firstItem.focus();
    				resizeAndPosition();
    			}
    		} else if (menuList.contains(event.target)) {
    			let itemId = parseInt(event.target.getAttribute("itemId"));

    			if (value) {
    				$$invalidate(1, menuItems[value.id].selected = false, menuItems);
    			}

    			$$invalidate(1, menuItems[itemId].selected = true, menuItems);
    			updateSelectedAndIds();
    			dispatch("change", menuItems[itemId]);

    			if (macOSBlink) {
    				var x = 4;
    				var interval = 70;

    				for (var i = 0; i < x; i++) {
    					setTimeout(
    						function () {
    							event.target.classList.toggle("blink");
    						},
    						i * interval
    					);
    				}

    				setTimeout(
    					function () {
    						menuList.classList.add("hidden");
    					},
    					interval * x + 40
    				);
    			} else {
    				menuList.classList.add("hidden");
    				menuButton.classList.remove("selected");
    			}
    		}
    	}

    	function resizeAndPosition() {
    		let maxMenuHeight = window.innerHeight - 16;
    		let menuHeight = menuList.offsetHeight;
    		let menuResized = false;

    		if (menuHeight > maxMenuHeight) {
    			$$invalidate(13, menuList.style.height = maxMenuHeight + "px", menuList);
    			menuResized = true;
    		}

    		var bounding = menuList.getBoundingClientRect();
    		var parentBounding = menuButton.getBoundingClientRect();
    		var topLimit = parentBounding.top - 8;

    		if (bounding.top < 0) {
    			$$invalidate(13, menuList.style.top = -Math.abs(parentBounding.top - 8) + "px", menuList);
    		}

    		if (bounding.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
    			let minTop = -Math.abs(parentBounding.top - (window.innerHeight - menuHeight - 8));
    			let newTop = -Math.abs(bounding.bottom - window.innerHeight + 16);

    			if (menuResized) {
    				$$invalidate(13, menuList.style.top = -Math.abs(parentBounding.top - 8) + "px", menuList);
    			} else if (newTop > minTop) {
    				$$invalidate(13, menuList.style.top = minTop + "px", menuList);
    			} else {
    				$$invalidate(13, menuList.style.top = newTop + "px", menuList);
    			}
    		}
    	}

    	function resetMenuProperties() {
    		$$invalidate(13, menuList.style.height = "auto", menuList);
    		$$invalidate(13, menuList.style.top = "0px", menuList);
    	}

    	const writable_props = [
    		"iconName",
    		"iconText",
    		"id",
    		"name",
    		"disabled",
    		"macOSBlink",
    		"menuItems",
    		"placeholder",
    		"value",
    		"showGroupLabels",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SelectMenu> was created with unknown prop '${key}'`);
    	});

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(12, menuButton = $$value);
    		});
    	}

    	function selectitem_selected_binding(value_1, item) {
    		item.selected = value_1;
    		$$invalidate(1, menuItems);
    	}

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(13, menuList = $$value);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(11, menuWrapper = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("iconName" in $$props) $$invalidate(4, iconName = $$props.iconName);
    		if ("iconText" in $$props) $$invalidate(5, iconText = $$props.iconText);
    		if ("id" in $$props) $$invalidate(6, id = $$props.id);
    		if ("name" in $$props) $$invalidate(7, name = $$props.name);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("macOSBlink" in $$props) $$invalidate(8, macOSBlink = $$props.macOSBlink);
    		if ("menuItems" in $$props) $$invalidate(1, menuItems = $$props.menuItems);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("showGroupLabels" in $$props) $$invalidate(9, showGroupLabels = $$props.showGroupLabels);
    		if ("class" in $$props) $$invalidate(10, className = $$props.class);
    	};

    	$$self.$capture_state = () => {
    		return {
    			iconName,
    			iconText,
    			id,
    			name,
    			disabled,
    			macOSBlink,
    			menuItems,
    			placeholder,
    			value,
    			showGroupLabels,
    			className,
    			groups,
    			menuWrapper,
    			menuButton,
    			menuList
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("iconName" in $$props) $$invalidate(4, iconName = $$props.iconName);
    		if ("iconText" in $$props) $$invalidate(5, iconText = $$props.iconText);
    		if ("id" in $$props) $$invalidate(6, id = $$props.id);
    		if ("name" in $$props) $$invalidate(7, name = $$props.name);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("macOSBlink" in $$props) $$invalidate(8, macOSBlink = $$props.macOSBlink);
    		if ("menuItems" in $$props) $$invalidate(1, menuItems = $$props.menuItems);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("showGroupLabels" in $$props) $$invalidate(9, showGroupLabels = $$props.showGroupLabels);
    		if ("className" in $$props) $$invalidate(10, className = $$props.className);
    		if ("groups" in $$props) groups = $$props.groups;
    		if ("menuWrapper" in $$props) $$invalidate(11, menuWrapper = $$props.menuWrapper);
    		if ("menuButton" in $$props) $$invalidate(12, menuButton = $$props.menuButton);
    		if ("menuList" in $$props) $$invalidate(13, menuList = $$props.menuList);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*menuItems*/ 2) {
    			 (updateSelectedAndIds());
    		}
    	};

    	return [
    		disabled,
    		menuItems,
    		placeholder,
    		value,
    		iconName,
    		iconText,
    		id,
    		name,
    		macOSBlink,
    		showGroupLabels,
    		className,
    		menuWrapper,
    		menuButton,
    		menuList,
    		menuClick,
    		dispatch,
    		groups,
    		updateSelectedAndIds,
    		checkGroups,
    		resizeAndPosition,
    		resetMenuProperties,
    		change_handler,
    		button_binding,
    		selectitem_selected_binding,
    		ul_binding,
    		div_binding
    	];
    }

    class SelectMenu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document_1.getElementById("svelte-z4nbus-style")) add_css$6();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			iconName: 4,
    			iconText: 5,
    			id: 6,
    			name: 7,
    			disabled: 0,
    			macOSBlink: 8,
    			menuItems: 1,
    			placeholder: 2,
    			value: 3,
    			showGroupLabels: 9,
    			class: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectMenu",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get iconName() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconName(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get iconText() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set iconText(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get macOSBlink() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set macOSBlink(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get menuItems() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set menuItems(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showGroupLabels() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showGroupLabels(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<SelectMenu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<SelectMenu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PluginUI.svelte generated by Svelte v3.16.7 */
    const file$8 = "src/PluginUI.svelte";

    // (42:1) <Label>
    function create_default_slot_3$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Shape");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(42:1) <Label>",
    		ctx
    	});

    	return block;
    }

    // (45:1) <Label>
    function create_default_slot_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Count");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(45:1) <Label>",
    		ctx
    	});

    	return block;
    }

    // (49:1) <Button on:click={cancel} secondary class="mr-xsmall">
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cancel");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(49:1) <Button on:click={cancel} secondary class=\\\"mr-xsmall\\\">",
    		ctx
    	});

    	return block;
    }

    // (50:1) <Button on:click={createShapes} primary bind:disabled={disabled}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Create shapes");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(50:1) <Button on:click={createShapes} primary bind:disabled={disabled}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div1;
    	let t0;
    	let updating_menuItems;
    	let updating_value;
    	let t1;
    	let t2;
    	let updating_value_1;
    	let t3;
    	let div0;
    	let t4;
    	let updating_disabled;
    	let current;

    	const label0 = new Label({
    			props: {
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function selectmenu_menuItems_binding(value) {
    		/*selectmenu_menuItems_binding*/ ctx[5].call(null, value);
    	}

    	function selectmenu_value_binding(value_1) {
    		/*selectmenu_value_binding*/ ctx[6].call(null, value_1);
    	}

    	let selectmenu_props = { class: "mb-xxsmall" };

    	if (/*menuItems*/ ctx[0] !== void 0) {
    		selectmenu_props.menuItems = /*menuItems*/ ctx[0];
    	}

    	if (/*selectedShape*/ ctx[2] !== void 0) {
    		selectmenu_props.value = /*selectedShape*/ ctx[2];
    	}

    	const selectmenu = new SelectMenu({ props: selectmenu_props, $$inline: true });
    	binding_callbacks.push(() => bind(selectmenu, "menuItems", selectmenu_menuItems_binding));
    	binding_callbacks.push(() => bind(selectmenu, "value", selectmenu_value_binding));

    	const label1 = new Label({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function input_value_binding(value_2) {
    		/*input_value_binding*/ ctx[7].call(null, value_2);
    	}

    	let input_props = { iconText: "#", class: "mb-xxsmall" };

    	if (/*count*/ ctx[3] !== void 0) {
    		input_props.value = /*count*/ ctx[3];
    	}

    	const input = new Input({ props: input_props, $$inline: true });
    	binding_callbacks.push(() => bind(input, "value", input_value_binding));

    	const button0 = new Button({
    			props: {
    				secondary: true,
    				class: "mr-xsmall",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", cancel);

    	function button1_disabled_binding(value_3) {
    		/*button1_disabled_binding*/ ctx[8].call(null, value_3);
    	}

    	let button1_props = {
    		primary: true,
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*disabled*/ ctx[1] !== void 0) {
    		button1_props.disabled = /*disabled*/ ctx[1];
    	}

    	const button1 = new Button({ props: button1_props, $$inline: true });
    	binding_callbacks.push(() => bind(button1, "disabled", button1_disabled_binding));
    	button1.$on("click", /*createShapes*/ ctx[4]);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(label0.$$.fragment);
    			t0 = space();
    			create_component(selectmenu.$$.fragment);
    			t1 = space();
    			create_component(label1.$$.fragment);
    			t2 = space();
    			create_component(input.$$.fragment);
    			t3 = space();
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t4 = space();
    			create_component(button1.$$.fragment);
    			attr_dev(div0, "class", "flex p-xxsmall mb-xsmall");
    			add_location(div0, file$8, 47, 1, 1420);
    			attr_dev(div1, "class", "wrapper p-xxsmall");
    			add_location(div1, file$8, 39, 0, 1190);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(label0, div1, null);
    			append_dev(div1, t0);
    			mount_component(selectmenu, div1, null);
    			append_dev(div1, t1);
    			mount_component(label1, div1, null);
    			append_dev(div1, t2);
    			mount_component(input, div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			mount_component(button0, div0, null);
    			append_dev(div0, t4);
    			mount_component(button1, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const label0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				label0_changes.$$scope = { dirty, ctx };
    			}

    			label0.$set(label0_changes);
    			const selectmenu_changes = {};

    			if (!updating_menuItems && dirty & /*menuItems*/ 1) {
    				updating_menuItems = true;
    				selectmenu_changes.menuItems = /*menuItems*/ ctx[0];
    				add_flush_callback(() => updating_menuItems = false);
    			}

    			if (!updating_value && dirty & /*selectedShape*/ 4) {
    				updating_value = true;
    				selectmenu_changes.value = /*selectedShape*/ ctx[2];
    				add_flush_callback(() => updating_value = false);
    			}

    			selectmenu.$set(selectmenu_changes);
    			const label1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				label1_changes.$$scope = { dirty, ctx };
    			}

    			label1.$set(label1_changes);
    			const input_changes = {};

    			if (!updating_value_1 && dirty & /*count*/ 8) {
    				updating_value_1 = true;
    				input_changes.value = /*count*/ ctx[3];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			input.$set(input_changes);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_disabled && dirty & /*disabled*/ 2) {
    				updating_disabled = true;
    				button1_changes.disabled = /*disabled*/ ctx[1];
    				add_flush_callback(() => updating_disabled = false);
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(label0.$$.fragment, local);
    			transition_in(selectmenu.$$.fragment, local);
    			transition_in(label1.$$.fragment, local);
    			transition_in(input.$$.fragment, local);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(label0.$$.fragment, local);
    			transition_out(selectmenu.$$.fragment, local);
    			transition_out(label1.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(label0);
    			destroy_component(selectmenu);
    			destroy_component(label1);
    			destroy_component(input);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function cancel() {
    	parent.postMessage({ pluginMessage: { "type": "cancel" } }, "*");
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let menuItems = [
    		{
    			"value": "rectangle",
    			"label": "Rectangle",
    			"group": null,
    			"selected": false
    		},
    		{
    			"value": "triangle",
    			"label": "Triangle ",
    			"group": null,
    			"selected": false
    		},
    		{
    			"value": "circle",
    			"label": "Circle",
    			"group": null,
    			"selected": false
    		}
    	];

    	var disabled = true;
    	var selectedShape;
    	var count = 5;

    	function createShapes() {
    		parent.postMessage(
    			{
    				pluginMessage: {
    					"type": "create-shapes",
    					count,
    					"shape": selectedShape.value
    				}
    			},
    			"*"
    		);
    	}

    	function selectmenu_menuItems_binding(value) {
    		menuItems = value;
    		$$invalidate(0, menuItems);
    	}

    	function selectmenu_value_binding(value_1) {
    		selectedShape = value_1;
    		$$invalidate(2, selectedShape);
    	}

    	function input_value_binding(value_2) {
    		count = value_2;
    		$$invalidate(3, count);
    	}

    	function button1_disabled_binding(value_3) {
    		disabled = value_3;
    		($$invalidate(1, disabled), $$invalidate(2, selectedShape));
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("menuItems" in $$props) $$invalidate(0, menuItems = $$props.menuItems);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("selectedShape" in $$props) $$invalidate(2, selectedShape = $$props.selectedShape);
    		if ("count" in $$props) $$invalidate(3, count = $$props.count);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedShape*/ 4) {
    			 $$invalidate(1, disabled = selectedShape === null);
    		}
    	};

    	return [
    		menuItems,
    		disabled,
    		selectedShape,
    		count,
    		createShapes,
    		selectmenu_menuItems_binding,
    		selectmenu_value_binding,
    		input_value_binding,
    		button1_disabled_binding
    	];
    }

    class PluginUI extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PluginUI",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new PluginUI({
    	target: document.body,
    });

    return app;

}());
