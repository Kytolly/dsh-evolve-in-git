import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Family-shared chrome for plugin settings cards: a disclosure header naming
 * the plugin and what its settings govern, the controls inside, and the save
 * that writes them. Renders nothing while the namespace is unavailable — a
 * deployment that does not compose the owning plugin should show no trace of
 * it. Inlined into each consumer's client bundle; mirrors the official
 * ui-plugin-config PluginCard in a self-contained slice.
 * @module dsh-evolve-in-git/client/PluginSettingsCard
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import css from './settings-card.module.css';
/** Copy keys the card chrome itself reads; every consumer locale carries this shared vocabulary. */
export const CARD_COPY_KEYS = [
    'settings.collapse',
    'settings.expand',
    'settings.notExposed',
    'settings.unsaved',
    'settings.readOnly',
    'settings.saveFailed',
    'settings.discard',
    'settings.save',
    'settings.saving',
];
/**
 * Render one plugin settings card.
 * @param props - the plugin's copy keys, its form state, and its controls.
 * @returns the card, or nothing while the namespace is still loading.
 */
export function PluginSettingsCard(props) {
    const [open, setOpen] = useState(props.defaultOpen ?? true);
    const { state, alwaysOpen } = props;
    if (!state.available)
        return null;
    const title = props.t(props.titleKey);
    const description = props.t(props.descriptionKey);
    const blocked = !state.dirty || state.invalid || state.saving;
    const expanded = alwaysOpen === true || open;
    const cardClass = expanded ? `${css.cardOpen} ${css.card}` : css.card;
    // With alwaysOpen the nav entry already provides the selection, so the
    // header is a static title row instead of a disclosure button.
    const header = alwaysOpen === true
        ? (_jsxs("div", { className: css.headerStatic, children: [_jsxs("span", { className: css.headText, children: [_jsx("span", { className: css.name, title: title, children: title }), _jsx("span", { className: css.description, title: description, children: description })] }), state.dirty ? _jsx("span", { className: css.pending, title: props.t('settings.unsaved'), children: props.t('settings.unsaved') }) : null] }))
        : (_jsxs("button", { type: "button", className: css.header, "aria-expanded": open, "aria-label": `${props.t(open ? 'settings.collapse' : 'settings.expand')}: ${title}`, onClick: () => { setOpen(!open); }, children: [_jsxs("span", { className: css.headText, children: [_jsx("span", { className: css.name, title: title, children: title }), _jsx("span", { className: css.description, title: description, children: description })] }), state.dirty ? _jsx("span", { className: css.pending, title: props.t('settings.unsaved'), children: props.t('settings.unsaved') }) : null, _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: open ? `${css.chevron} ${css.chevronOpen}` : css.chevron, children: _jsx("path", { d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z", fill: "currentColor" }) })] }));
    // The namespace exists but the Host does not serve it to this client: show a
    // card that explains the gap instead of vanishing, so a missing card never
    // reads as a missing plugin.
    if (!state.exposed) {
        return (_jsxs("li", { className: cardClass, children: [header, expanded
                    ? (_jsx("div", { className: css.body, children: _jsx("p", { className: css.notExposed, role: "status", children: props.t('settings.notExposed') }) }))
                    : null] }));
    }
    return (_jsxs("li", { className: cardClass, children: [header, expanded
                ? (_jsxs("div", { className: css.body, children: [!state.writable ? _jsx("p", { className: css.readOnly, role: "status", children: props.t('settings.readOnly') }) : null, props.children, _jsxs("div", { className: css.footer, children: [state.failed
                                    ? (_jsxs("p", { className: css.failed, role: "status", children: [props.t('settings.saveFailed'), state.failedReason ? ' - ' + state.failedReason : ''] }))
                                    : null, _jsx("button", { type: "button", className: css.discard, disabled: !state.dirty || state.saving, onClick: props.onDiscard, children: props.t('settings.discard') }), _jsx("button", { type: "button", className: css.save, disabled: blocked, onClick: props.onSave, children: props.t(!state.saving ? 'settings.save' : 'settings.saving') })] })] }))
                : null] }));
}
/** A staged value field. `numeric` only hints the keypad: which drafts a field accepts is decided by its spec. */
export function ValueField(props) {
    return (_jsxs("div", { className: css.field, children: [_jsxs("div", { className: css.head, children: [_jsx("label", { className: css.label, htmlFor: props.id, children: props.label }), props.overridden
                        ? (_jsxs("span", { className: css.badges, children: [_jsx("span", { className: css.badge, children: props.overriddenLabel }), _jsx("button", { type: "button", className: css.reset, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })] }))
                        : null] }), _jsx("input", { id: props.id, className: props.invalid ? css.inputInvalid : css.input, type: "text", ...props.numeric === true ? { inputMode: 'numeric' } : {}, ...props.invalid ? { 'aria-invalid': true } : {}, value: props.text, placeholder: props.placeholder ?? '', disabled: props.disabled, onChange: (event) => { props.onEdit(event.target.value); } }), _jsx("p", { className: props.invalid ? css.invalid : css.hint, children: props.invalid ? props.invalidLabel : props.hint })] }));
}
const NON_SKIN_BODY_MARKERS = new Set(['dshSkinCenter', 'dshSidebarCollapsed']);
// 检测使用使用皮肤，用了皮肤退回原生select样式，防止样式冲突。默认外观下使用优化后的select样式。
function isSkinActive() {
    const datasetList = Object.keys(document.body.dataset);
    const isActive = datasetList.some(key => key.startsWith('dsh') && !NON_SKIN_BODY_MARKERS.has(key));
    return isActive;
}
const SELECT_CLOSE_MS = 100;
/**
 * The shared dual-mode select control. While an appearance skin is active it
 * renders the legacy native <select> untouched, so element-level skin
 * selectors keep working; under the default appearance it renders a
 * self-drawn role="listbox" popup whose open/close is transition-animated.
 * 双模式下拉框：皮肤激活时用原生 select，默认外观用自绘动画弹层。
 */
export function SelectField(props) {
    const { id, options, value } = props;
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [phase, setPhase] = useState('initial');
    const [activeIndex, setActiveIndex] = useState(0);
    const closeTimer = useRef(undefined);
    const wrapRef = useRef(null);
    const popupRef = useRef(null);
    const currentIndex = () => {
        const index = options.findIndex(option => option.value === value);
        return index >= 0 ? index : 0;
    };
    const close = useCallback(() => {
        if (closeTimer.current !== undefined)
            clearTimeout(closeTimer.current);
        setClosing(true);
        closeTimer.current = setTimeout(() => {
            setClosing(false);
            setOpen(false);
        }, SELECT_CLOSE_MS);
    }, []);
    const openPopup = () => {
        if (closeTimer.current !== undefined)
            clearTimeout(closeTimer.current);
        setActiveIndex(currentIndex());
        setPhase('initial');
        setClosing(false);
        setOpen(true);
    };
    const commit = (index) => {
        const option = options[index];
        if (option)
            props.onEdit(option.value);
        close();
    };
    const onTriggerClick = () => {
        if (props.disabled)
            return;
        if (open && !closing)
            close();
        else
            openPopup();
    };
    const onKeyDown = (event) => {
        if (props.disabled)
            return;
        const count = options.length;
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp':
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (!open) {
                    openPopup();
                }
                else if (!closing) {
                    if (event.key === 'ArrowDown')
                        setActiveIndex(index => (index + 1) % count);
                    else if (event.key === 'ArrowUp')
                        setActiveIndex(index => (index - 1 + count) % count);
                    else
                        commit(activeIndex);
                }
                break;
            case 'Escape':
                if (open) {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                }
                break;
            case 'Tab':
                if (open)
                    close();
                break;
        }
    };
    useEffect(() => () => {
        if (closeTimer.current !== undefined)
            clearTimeout(closeTimer.current);
    }, []);
    useLayoutEffect(() => {
        if (open && !closing && phase === 'initial') {
            void popupRef.current?.offsetHeight;
            setPhase('open');
        }
    }, [open, closing, phase]);
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (target instanceof Node && !wrapRef.current?.contains(target))
                close();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open, close]);
    useEffect(() => {
        if (props.disabled && open)
            close();
    }, [props.disabled, open, close]);
    // 使用了皮肤则退回原生select样式防止样式冲突。
    if (isSkinActive()) {
        return (_jsx("select", { id: id, className: css.select, value: value, disabled: props.disabled, onChange: (event) => { props.onEdit(event.target.value); }, children: options.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) }));
    }
    const label = options.find(option => option.value === value)?.label ?? '';
    const popupClass = closing
        ? `${css.selectPopup} ${css.selectPopupClose}`
        : phase === 'open'
            ? `${css.selectPopup} ${css.selectPopupOpen}`
            : css.selectPopup;
    return (_jsxs("div", { className: css.selectWrap, ref: wrapRef, children: [_jsxs("button", { type: "button", id: id, className: `${css.select} ${css.selectButton}`, disabled: props.disabled, "aria-haspopup": "listbox", "aria-expanded": open, "aria-activedescendant": open ? `${id}-o${activeIndex}` : undefined, "aria-invalid": props.invalid || undefined, onClick: onTriggerClick, onKeyDown: onKeyDown, children: [_jsx("span", { className: css.selectLabel, children: label }), _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: open ? `${css.selectChevron} ${css.selectChevronOpen}` : css.selectChevron, "aria-hidden": "true", children: _jsx("path", { d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z", fill: "currentColor" }) })] }), open
                ? (_jsx("div", { className: popupClass, role: "listbox", ref: popupRef, children: options.map((option, index) => (_jsx("div", { id: `${id}-o${index}`, role: "option", "aria-selected": option.value === value, className: `${css.selectOption}${option.value === value ? ` ${css.selectOptionSelected}` : ''}${index === activeIndex && !closing ? ` ${css.selectOptionActive}` : ''}`, onClick: () => { commit(index); }, children: option.label }, option.value))) }))
                : null] }));
}
/** A staged boolean field: 继承 / 开 / 关. */
export function BooleanField(props) {
    return (_jsxs("div", { className: css.field, children: [_jsxs("div", { className: css.head, children: [_jsx("label", { className: css.label, htmlFor: props.id, children: props.label }), props.overridden
                        ? (_jsxs("span", { className: css.badges, children: [_jsx("span", { className: css.badge, children: props.overriddenLabel }), _jsx("button", { type: "button", className: css.reset, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })] }))
                        : null] }), _jsx(SelectField, { id: props.id, options: [
                    { value: '', label: props.inheritLabel },
                    { value: 'true', label: props.onLabel },
                    { value: 'false', label: props.offLabel },
                ], value: props.text, disabled: props.disabled, invalid: props.invalid, onEdit: props.onEdit }), _jsx("p", { className: css.hint, children: props.hint })] }));
}
/** A staged enumerated field rendered as a select. */
export function ChoiceField(props) {
    return (_jsxs("div", { className: css.field, children: [_jsxs("div", { className: css.head, children: [_jsx("label", { className: css.label, htmlFor: props.id, children: props.label }), props.overridden
                        ? (_jsxs("span", { className: css.badges, children: [_jsx("span", { className: css.badge, children: props.overriddenLabel }), _jsx("button", { type: "button", className: css.reset, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })] }))
                        : null] }), _jsx(SelectField, { id: props.id, options: [{ value: '', label: props.inheritLabel }, ...props.choices], value: props.text, disabled: props.disabled, invalid: props.invalid, onEdit: props.onEdit }), _jsx("p", { className: props.invalid ? css.invalid : css.hint, children: props.invalid ? props.invalidLabel : props.hint })] }));
}
