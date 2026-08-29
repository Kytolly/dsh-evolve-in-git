window.__ModuleLoader__.load({
	id: "dsh-evolve-in-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region \0dsh-css:D:\Deepseek Harness\dsh-evolve-in-git\src\client\settings-card.module.css.mjs
		const css$1 = ".XRqyLa_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.XRqyLa_card:hover{border-color:var(--dsw-alias-label-dimmed)}.XRqyLa_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.XRqyLa_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.XRqyLa_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.XRqyLa_headerStatic{border-radius:12px;align-items:center;gap:12px;width:100%;padding:14px 16px;display:flex}.XRqyLa_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.XRqyLa_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.XRqyLa_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.XRqyLa_pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.XRqyLa_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.XRqyLa_chevronOpen{transform:rotate(180deg)}.XRqyLa_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.XRqyLa_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.XRqyLa_notExposed{color:var(--dsw-alias-state-warn-primary);margin:12px 0 0;font-size:12px;line-height:1.5}.XRqyLa_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.XRqyLa_failed{min-width:0;color:var(--dsw-alias-label-error);text-overflow:ellipsis;white-space:nowrap;flex:1;margin:0;font-size:12px;line-height:1.5;overflow:hidden}.XRqyLa_discard,.XRqyLa_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.XRqyLa_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.XRqyLa_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.XRqyLa_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.XRqyLa_discard:disabled,.XRqyLa_save:disabled{opacity:.4;cursor:default}.XRqyLa_discard:focus-visible,.XRqyLa_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.XRqyLa_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.XRqyLa_field+.XRqyLa_field{border-top:1px solid var(--dsw-alias-border-l2)}.XRqyLa_head{align-items:center;gap:8px;display:flex}.XRqyLa_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.XRqyLa_badges{align-items:center;gap:8px;display:inline-flex}.XRqyLa_badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.XRqyLa_reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.XRqyLa_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.XRqyLa_reset:disabled{cursor:default}.XRqyLa_reset:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.XRqyLa_input,.XRqyLa_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.XRqyLa_input:focus-visible,.XRqyLa_select:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.XRqyLa_input:disabled,.XRqyLa_select:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.XRqyLa_inputInvalid{border:1px solid var(--dsw-alias-label-error);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.XRqyLa_inputInvalid:focus-visible{outline:2px solid var(--dsw-alias-label-error);outline-offset:1px;border-color:var(--dsw-alias-label-error)}.XRqyLa_selectWrap{position:relative}.XRqyLa_selectButton{appearance:none;text-align:left;cursor:pointer;justify-content:space-between;align-items:center;gap:8px;width:100%;display:flex}.XRqyLa_selectLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.XRqyLa_selectChevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.XRqyLa_selectChevronOpen{transform:rotate(180deg)}.XRqyLa_selectPopup{z-index:40;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);max-height:240px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-2);opacity:0;border-radius:8px;flex-direction:column;padding:4px;transition:opacity .1s,transform .1s;display:flex;position:absolute;top:calc(100% + 4px);left:0;right:0;overflow-y:auto;transform:translateY(-4px)}.XRqyLa_selectPopupOpen{opacity:1;transform:none}.XRqyLa_selectPopupClose{opacity:0;pointer-events:none;transform:translateY(-4px)}.XRqyLa_selectOption{color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;text-overflow:ellipsis;border-radius:6px;flex-shrink:0;padding:6px 10px;font-size:13px;line-height:1.5;overflow:hidden}.XRqyLa_selectOption:hover,.XRqyLa_selectOptionActive{background:var(--dsw-alias-interactive-bg-hover)}.XRqyLa_selectOptionSelected{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 10%, transparent);font-weight:500}.XRqyLa_invalid{color:var(--dsw-alias-label-error);margin:0;font-size:12px;line-height:1.5}.XRqyLa_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}@media (prefers-reduced-motion:reduce){.XRqyLa_card,.XRqyLa_header,.XRqyLa_chevron,.XRqyLa_chevronOpen,.XRqyLa_discard,.XRqyLa_save,.XRqyLa_selectChevron,.XRqyLa_selectChevronOpen,.XRqyLa_selectPopup{transition:none}}.XRqyLa_configFile{border-top:1px solid var(--dsw-alias-border-l2);margin-top:8px}.XRqyLa_configFileHeader{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 0 4px;display:flex}.XRqyLa_configFileHeader:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.XRqyLa_configFileBody{padding:8px 0 4px}.XRqyLa_textarea{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);box-sizing:border-box;width:100%;font:inherit;color:var(--dsw-alias-label-primary);resize:vertical;border-radius:8px;min-height:120px;padding:10px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5}.XRqyLa_textarea:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.XRqyLa_textarea:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.XRqyLa_configFilePath{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;margin:6px 0 0;font-size:11px;line-height:1.5;overflow:hidden}.XRqyLa_saved{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-primary));margin:6px 0 0;font-size:12px;line-height:1.5}";
		const tagId$1 = "dsh-evolve-in-git/settings-card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-evolve-in-git";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var settings_card_module_css_default = {
			"badge": "XRqyLa_badge",
			"badges": "XRqyLa_badges",
			"body": "XRqyLa_body",
			"card": "XRqyLa_card",
			"cardOpen": "XRqyLa_cardOpen",
			"chevron": "XRqyLa_chevron",
			"chevronOpen": "XRqyLa_chevronOpen",
			"configFile": "XRqyLa_configFile",
			"configFileBody": "XRqyLa_configFileBody",
			"configFileHeader": "XRqyLa_configFileHeader",
			"configFilePath": "XRqyLa_configFilePath",
			"description": "XRqyLa_description",
			"discard": "XRqyLa_discard",
			"failed": "XRqyLa_failed",
			"field": "XRqyLa_field",
			"footer": "XRqyLa_footer",
			"head": "XRqyLa_head",
			"headText": "XRqyLa_headText",
			"header": "XRqyLa_header",
			"headerStatic": "XRqyLa_headerStatic",
			"hint": "XRqyLa_hint",
			"input": "XRqyLa_input",
			"inputInvalid": "XRqyLa_inputInvalid",
			"invalid": "XRqyLa_invalid",
			"label": "XRqyLa_label",
			"name": "XRqyLa_name",
			"notExposed": "XRqyLa_notExposed",
			"pending": "XRqyLa_pending",
			"readOnly": "XRqyLa_readOnly",
			"reset": "XRqyLa_reset",
			"save": "XRqyLa_save",
			"saved": "XRqyLa_saved",
			"select": "XRqyLa_select",
			"selectButton": "XRqyLa_selectButton",
			"selectChevron": "XRqyLa_selectChevron",
			"selectChevronOpen": "XRqyLa_selectChevronOpen",
			"selectLabel": "XRqyLa_selectLabel",
			"selectOption": "XRqyLa_selectOption",
			"selectOptionActive": "XRqyLa_selectOptionActive",
			"selectOptionSelected": "XRqyLa_selectOptionSelected",
			"selectPopup": "XRqyLa_selectPopup",
			"selectPopupClose": "XRqyLa_selectPopupClose",
			"selectPopupOpen": "XRqyLa_selectPopupOpen",
			"selectWrap": "XRqyLa_selectWrap",
			"textarea": "XRqyLa_textarea"
		};
		//#endregion
		//#region src/client/PluginSettingsCard.tsx
		/**
		* Family-shared chrome for plugin settings cards: a disclosure header naming
		* the plugin and what its settings govern, the controls inside, and the save
		* that writes them. Renders nothing while the namespace is unavailable — a
		* deployment that does not compose the owning plugin should show no trace of
		* it. Inlined into each consumer's client bundle; mirrors the official
		* ui-plugin-config PluginCard in a self-contained slice.
		* @module dsh-evolve-in-git/client/PluginSettingsCard
		*/
		/**
		* Render one plugin settings card.
		* @param props - the plugin's copy keys, its form state, and its controls.
		* @returns the card, or nothing while the namespace is still loading.
		*/
		function PluginSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(props.defaultOpen ?? true);
			const { state, alwaysOpen } = props;
			if (!state.available) return null;
			const title = props.t(props.titleKey);
			const description = props.t(props.descriptionKey);
			const blocked = !state.dirty || state.invalid || state.saving;
			const expanded = alwaysOpen === true || open;
			const cardClass = expanded ? `${settings_card_module_css_default.cardOpen} ${settings_card_module_css_default.card}` : settings_card_module_css_default.card;
			const header = alwaysOpen === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.headerStatic,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: settings_card_module_css_default.headText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_card_module_css_default.name,
						title,
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_card_module_css_default.description,
						title: description,
						children: description
					})]
				}), state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: settings_card_module_css_default.pending,
					title: props.t("settings.unsaved"),
					children: props.t("settings.unsaved")
				}) : null]
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: settings_card_module_css_default.header,
				"aria-expanded": open,
				"aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
				onClick: () => {
					setOpen(!open);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: settings_card_module_css_default.headText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.name,
							title,
							children: title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.description,
							title: description,
							children: description
						})]
					}),
					state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_card_module_css_default.pending,
						title: props.t("settings.unsaved"),
						children: props.t("settings.unsaved")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${settings_card_module_css_default.chevron} ${settings_card_module_css_default.chevronOpen}` : settings_card_module_css_default.chevron,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})
				]
			});
			if (!state.exposed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cardClass,
				children: [header, expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_card_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.notExposed,
						role: "status",
						children: props.t("settings.notExposed")
					})
				}) : null]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cardClass,
				children: [header, expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.body,
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.readOnly,
							role: "status",
							children: props.t("settings.readOnly")
						}) : null,
						props.children,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.footer,
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: settings_card_module_css_default.failed,
									role: "status",
									children: [props.t("settings.saveFailed"), state.failedReason ? " - " + state.failedReason : ""]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.discard,
									disabled: !state.dirty || state.saving,
									onClick: props.onDiscard,
									children: props.t("settings.discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.save,
									disabled: blocked,
									onClick: props.onSave,
									children: props.t(!state.saving ? "settings.save" : "settings.saving")
								})
							]
						})
					]
				}) : null]
			});
		}
		/** A staged value field. `numeric` only hints the keypad: which drafts a field accepts is decided by its spec. */
		function ValueField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: props.invalid ? settings_card_module_css_default.inputInvalid : settings_card_module_css_default.input,
						type: "text",
						...props.numeric === true ? { inputMode: "numeric" } : {},
						...props.invalid ? { "aria-invalid": true } : {},
						value: props.text,
						placeholder: props.placeholder ?? "",
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.invalid ? settings_card_module_css_default.invalid : settings_card_module_css_default.hint,
						children: props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		const NON_SKIN_BODY_MARKERS = /* @__PURE__ */ new Set(["dshSkinCenter", "dshSidebarCollapsed"]);
		function isSkinActive() {
			return Object.keys(document.body.dataset).some((key) => key.startsWith("dsh") && !NON_SKIN_BODY_MARKERS.has(key));
		}
		const SELECT_CLOSE_MS = 100;
		/**
		* The shared dual-mode select control. While an appearance skin is active it
		* renders the legacy native <select> untouched, so element-level skin
		* selectors keep working; under the default appearance it renders a
		* self-drawn role="listbox" popup whose open/close is transition-animated.
		* 双模式下拉框：皮肤激活时用原生 select，默认外观用自绘动画弹层。
		*/
		function SelectField(props) {
			const { id, options, value } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [closing, setClosing] = (0, react.useState)(false);
			const [phase, setPhase] = (0, react.useState)("initial");
			const [activeIndex, setActiveIndex] = (0, react.useState)(0);
			const closeTimer = (0, react.useRef)(void 0);
			const wrapRef = (0, react.useRef)(null);
			const popupRef = (0, react.useRef)(null);
			const currentIndex = () => {
				const index = options.findIndex((option) => option.value === value);
				return index >= 0 ? index : 0;
			};
			const close = (0, react.useCallback)(() => {
				if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
				setClosing(true);
				closeTimer.current = setTimeout(() => {
					setClosing(false);
					setOpen(false);
				}, SELECT_CLOSE_MS);
			}, []);
			const openPopup = () => {
				if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
				setActiveIndex(currentIndex());
				setPhase("initial");
				setClosing(false);
				setOpen(true);
			};
			const commit = (index) => {
				const option = options[index];
				if (option) props.onEdit(option.value);
				close();
			};
			const onTriggerClick = () => {
				if (props.disabled) return;
				if (open && !closing) close();
				else openPopup();
			};
			const onKeyDown = (event) => {
				if (props.disabled) return;
				const count = options.length;
				switch (event.key) {
					case "ArrowDown":
					case "ArrowUp":
					case "Enter":
					case " ":
						event.preventDefault();
						if (!open) openPopup();
						else if (!closing) {
							if (event.key === "ArrowDown") setActiveIndex((index) => (index + 1) % count);
							else if (event.key === "ArrowUp") setActiveIndex((index) => (index - 1 + count) % count);
							else commit(activeIndex);
						}
						break;
					case "Escape":
						if (open) {
							event.preventDefault();
							event.stopPropagation();
							close();
						}
						break;
					case "Tab": if (open) close();
				}
			};
			(0, react.useEffect)(() => () => {
				if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (open && !closing && phase === "initial") {
					popupRef.current?.offsetHeight;
					setPhase("open");
				}
			}, [
				open,
				closing,
				phase
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target instanceof Node && !wrapRef.current?.contains(target)) close();
				};
				document.addEventListener("pointerdown", onPointerDown);
				return () => document.removeEventListener("pointerdown", onPointerDown);
			}, [open, close]);
			(0, react.useEffect)(() => {
				if (props.disabled && open) close();
			}, [
				props.disabled,
				open,
				close
			]);
			if (isSkinActive()) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
				id,
				className: settings_card_module_css_default.select,
				value,
				disabled: props.disabled,
				onChange: (event) => {
					props.onEdit(event.target.value);
				},
				children: options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
					value: option.value,
					children: option.label
				}, option.value))
			});
			const label = options.find((option) => option.value === value)?.label ?? "";
			const popupClass = closing ? `${settings_card_module_css_default.selectPopup} ${settings_card_module_css_default.selectPopupClose}` : phase === "open" ? `${settings_card_module_css_default.selectPopup} ${settings_card_module_css_default.selectPopupOpen}` : settings_card_module_css_default.selectPopup;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.selectWrap,
				ref: wrapRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					id,
					className: `${settings_card_module_css_default.select} ${settings_card_module_css_default.selectButton}`,
					disabled: props.disabled,
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					"aria-activedescendant": open ? `${id}-o${activeIndex}` : void 0,
					"aria-invalid": props.invalid || void 0,
					onClick: onTriggerClick,
					onKeyDown,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: settings_card_module_css_default.selectLabel,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${settings_card_module_css_default.selectChevron} ${settings_card_module_css_default.selectChevronOpen}` : settings_card_module_css_default.selectChevron,
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: popupClass,
					role: "listbox",
					ref: popupRef,
					children: options.map((option, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						id: `${id}-o${index}`,
						role: "option",
						"aria-selected": option.value === value,
						className: `${settings_card_module_css_default.selectOption}${option.value === value ? ` ${settings_card_module_css_default.selectOptionSelected}` : ""}${index === activeIndex && !closing ? ` ${settings_card_module_css_default.selectOptionActive}` : ""}`,
						onClick: () => {
							commit(index);
						},
						children: option.label
					}, option.value))
				}) : null]
			});
		}
		/** A staged boolean field: 继承 / 开 / 关. */
		function BooleanField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
						id: props.id,
						options: [
							{
								value: "",
								label: props.inheritLabel
							},
							{
								value: "true",
								label: props.onLabel
							},
							{
								value: "false",
								label: props.offLabel
							}
						],
						value: props.text,
						disabled: props.disabled,
						invalid: props.invalid,
						onEdit: props.onEdit
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.hint,
						children: props.hint
					})
				]
			});
		}
		/** A staged enumerated field rendered as a select. */
		function ChoiceField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
						id: props.id,
						options: [{
							value: "",
							label: props.inheritLabel
						}, ...props.choices],
						value: props.text,
						disabled: props.disabled,
						invalid: props.invalid,
						onEdit: props.onEdit
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.invalid ? settings_card_module_css_default.invalid : settings_card_module_css_default.hint,
						children: props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		//#endregion
		//#region src/client/config-file-scope.ts
		/** Window event the config-file editor dispatches after a successful save. */
		const CONFIG_SAVED_EVENT = "evolve-git:config-saved";
		/** Deep-merge one plain-object layer over another (auth merges per subkey). */
		function mergeLayers(base, over) {
			const merged = { ...base };
			for (const [key, value] of Object.entries(over)) {
				const under = merged[key];
				if (isPlainObject(value) && isPlainObject(under)) merged[key] = {
					...under,
					...value
				};
				else merged[key] = value;
			}
			return merged;
		}
		function isPlainObject(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Set a value at a dotted path ('' segments are ignored), creating containers. */
		function setByPath(root, path, value) {
			const segments = path.split(".").filter((segment) => segment !== "");
			if (segments.length === 0) return;
			let cursor = root;
			for (let index = 0; index < segments.length - 1; index++) {
				const segment = segments[index];
				const child = cursor[segment];
				if (!isPlainObject(child)) {
					const created = {};
					cursor[segment] = created;
					cursor = created;
				} else cursor = child;
			}
			cursor[segments[segments.length - 1]] = value;
		}
		/** Delete a value at a dotted path (no-op when absent). */
		function deleteByPath(root, path) {
			const segments = path.split(".").filter((segment) => segment !== "");
			if (segments.length === 0) return;
			let cursor = root;
			for (let index = 0; index < segments.length - 1; index++) {
				const child = cursor[segments[index]];
				if (!isPlainObject(child)) return;
				cursor = child;
			}
			delete cursor[segments[segments.length - 1]];
		}
		/**
		* The config file as a live settings scope. Loading fetches the file plus the
		* plugin defaults; the effective value is defaults overlaid by the file, so a
		* configured field visibly overrides its default. set/unset merge into the
		* file and PUT it back; a successful write re-seeds from the host response.
		*/
		var ConfigFileScope = class {
			listeners = /* @__PURE__ */ new Set();
			snapshot;
			user = {};
			defaults = {};
			revision = 1;
			disposed = false;
			constructor() {
				this.snapshot = {
					status: "loading",
					value: void 0,
					base: void 0,
					user: void 0,
					revision: void 0,
					writable: false,
					mode: "host"
				};
				window.addEventListener(CONFIG_SAVED_EVENT, () => {
					this.reload();
				});
			}
			/** Fetch the config document and defaults, then publish a ready snapshot. */
			async load() {
				if (this.disposed) return;
				this.snapshot = {
					...this.snapshot,
					status: "loading"
				};
				this.publish();
				try {
					const body = await fetchConfigFile();
					this.defaults = body.defaults ?? {};
					this.user = body.config ?? {};
					this.snapshot = {
						status: "ready",
						value: mergeLayers(this.defaults, this.user),
						base: this.defaults,
						user: this.user,
						revision: this.revision,
						writable: true,
						mode: "host"
					};
					this.publish();
				} catch {
					this.snapshot = {
						status: "unavailable",
						value: void 0,
						base: void 0,
						user: void 0,
						revision: void 0,
						writable: false,
						mode: "host"
					};
					this.publish();
				}
			}
			/** Re-fetch after an external save (config-file editor). */
			reload() {
				return this.load();
			}
			/** @returns the current sync snapshot (stable reference until the next change). */
			getSnapshot() {
				return this.snapshot;
			}
			/** Observe snapshot replacements. */
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/** Merge one field into the file and persist. */
			async set(field, value) {
				const next = structuredClone(this.user);
				setByPath(next, field, value);
				await this.persist(next);
			}
			/** Remove one field from the file and persist. */
			async unset(field) {
				const next = structuredClone(this.user);
				deleteByPath(next, field);
				await this.persist(next);
			}
			/** Release the window listener and every subscriber. */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				window.removeEventListener(CONFIG_SAVED_EVENT, this.onConfigSaved);
				this.listeners.clear();
			}
			onConfigSaved = () => {
				this.reload();
			};
			async persist(next) {
				const body = await saveConfigFile(JSON.stringify(next, null, 2) + "\n");
				this.user = body.config ?? next;
				this.revision += 1;
				this.snapshot = {
					status: "ready",
					value: mergeLayers(this.defaults, this.user),
					base: this.defaults,
					user: this.user,
					revision: this.revision,
					writable: true,
					mode: "host"
				};
				this.publish();
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		async function fetchConfigFile() {
			const response = await fetch("/api/evolve-git/config");
			const body = await response.json();
			if (!response.ok || body.ok !== true) throw new Error(body.error ?? "load failed");
			return body;
		}
		async function saveConfigFile(raw) {
			const response = await fetch("/api/evolve-git/config", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ raw })
			});
			const body = await response.json();
			if (!response.ok || body.ok !== true) throw new Error(body.error ?? "save failed");
			return body;
		}
		//#endregion
		//#region src/client/ConfigFileEditor.tsx
		/**
		* Config-file editor inside the evolve settings card: opens the per-user
		* `$DSH_HOME/evolve-in-git.json` document, edits it as raw JSON text, and
		* saves it back through the loopback-only '/api/evolve-git/config' route.
		* The config file is the highest-priority user layer (it overrides the
		* settings-namespace form above and the profile patch layer), so this editor
		* is the advanced / every-user surface — each DSH user keeps their own file
		* and it never enters any Git repository.
		* @module dsh-evolve-in-git/client/ConfigFileEditor
		*/
		/** Load the config document text. */
		async function fetchConfig() {
			const response = await fetch("/api/evolve-git/config");
			const body = await response.json();
			if (!response.ok || body.ok !== true) throw new Error(body.error ?? "load failed");
			return body;
		}
		/** Save the config document text. */
		async function saveConfig(raw) {
			const response = await fetch("/api/evolve-git/config", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ raw })
			});
			const body = await response.json();
			if (!response.ok || body.ok !== true) throw new Error(body.error ?? "save failed");
			return body;
		}
		/**
		* Render the config-file editor.
		* @param props - locale copy.
		* @returns the editor.
		*/
		function ConfigFileEditor(props) {
			const { t } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [status, setStatus] = (0, react.useState)("idle");
			const [text, setText] = (0, react.useState)("");
			const [path, setPath] = (0, react.useState)("");
			const [message, setMessage] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				setStatus("loading");
				fetchConfig().then((body) => {
					setText(body.raw ?? "");
					setPath(body.path ?? "");
					setStatus("idle");
					setMessage("");
				}).catch((error) => {
					setStatus("error");
					setMessage(error instanceof Error ? error.message : String(error));
				});
			}, []);
			(0, react.useEffect)(() => {
				if (open && status === "idle" && text === "" && path === "") load();
			}, [
				open,
				status,
				text,
				path,
				load
			]);
			const save = (0, react.useCallback)(() => {
				setStatus("saving");
				saveConfig(text).then((body) => {
					setPath(body.path ?? path);
					setStatus("saved");
					setMessage("");
					window.dispatchEvent(new CustomEvent(CONFIG_SAVED_EVENT));
				}).catch((error) => {
					setStatus("error");
					setMessage(error instanceof Error ? error.message : String(error));
				});
			}, [text, path]);
			const busy = status === "loading" || status === "saving";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.configFile,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: settings_card_module_css_default.configFileHeader,
					"aria-expanded": open,
					onClick: () => {
						setOpen(!open);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: settings_card_module_css_default.headText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.name,
							children: t("configFile.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.description,
							children: t("configFile.description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${settings_card_module_css_default.chevron} ${settings_card_module_css_default.chevronOpen}` : settings_card_module_css_default.chevron,
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.configFileBody,
					children: [
						status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.hint,
							role: "status",
							children: t("configFile.loading")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: settings_card_module_css_default.textarea,
							rows: 10,
							spellCheck: false,
							"aria-label": t("configFile.title"),
							value: text,
							disabled: busy,
							onChange: (event) => {
								setText(event.target.value);
								if (status === "saved" || status === "error") setStatus("idle");
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.configFilePath,
							title: path,
							children: path === "" ? t("configFile.empty") : path
						}),
						status === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.saved,
							role: "status",
							children: t("configFile.saved", { path: path === "" ? "?" : path })
						}) : null,
						status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.failed,
							role: "status",
							children: t("configFile.error", { error: message })
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.footer,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.discard,
								disabled: busy,
								onClick: load,
								children: t("configFile.reload")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.save,
								disabled: busy,
								onClick: save,
								children: status === "saving" ? t("configFile.saving") : t("configFile.save")
							})]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/settings-form.ts
		/** A whole- or decimal-number field. An empty draft clears the field; any other draft that is not a finite number within the constraints blocks the save. */
		function numberField(field, constraints = {}) {
			const { integer = false, min } = constraints;
			return {
				field,
				format: (value) => typeof value === "number" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					if (!Number.isFinite(parsed)) return void 0;
					if (integer && !Number.isInteger(parsed)) return void 0;
					if (min !== void 0 && parsed < min) return void 0;
					return {
						kind: "set",
						value: parsed
					};
				}
			};
		}
		/** A free-text field. An empty draft clears the field. */
		function textField(field) {
			return {
				field,
				format: (value) => typeof value === "string" ? value : "",
				parse: (text) => {
					const trimmed = text.trim();
					return trimmed === "" ? { kind: "clear" } : {
						kind: "set",
						value: trimmed
					};
				}
			};
		}
		/**
		* A free-text field the Host treats as a secret and redacts from the read-back
		* (role('secret') in the section schema). The card still edits it like text,
		* but a save never compares the redacted value back and relies on the scope
		* reporting the write landed.
		*/
		function secretField(field) {
			return {
				...textField(field),
				secret: true
			};
		}
		/** A boolean field, edited through true/false draft text. */
		function booleanField(field) {
			return {
				field,
				format: (value) => typeof value === "boolean" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					if (trimmed === "true") return {
						kind: "set",
						value: true
					};
					if (trimmed === "false") return {
						kind: "set",
						value: false
					};
				}
			};
		}
		/** An enumerated string field; only the listed choices are accepted. An empty draft clears the field. */
		function choiceField(field, choices) {
			return {
				field,
				format: (value) => typeof value === "string" && choices.includes(value) ? value : "",
				parse: (text) => {
					if (text === "") return { kind: "clear" };
					return choices.includes(text) ? {
						kind: "set",
						value: text
					} : void 0;
				}
			};
		}
		/**
		* Attach an object root to a field spec: the field is written as one member of
		* the named root object in a single wholesale write (see FieldSpec.objectRoot).
		*/
		function objectField(spec, objectRoot) {
			return {
				...spec,
				objectRoot
			};
		}
		/** Deep equality over JSON-compatible data. */
		function deepEqualJson(a, b) {
			if (a === b) return true;
			if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
			if (Array.isArray(a) || Array.isArray(b)) {
				if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
				return a.every((entry, index) => deepEqualJson(entry, b[index]));
			}
			const left = a;
			const right = b;
			const keys = Object.keys(left);
			if (keys.length !== Object.keys(right).length) return false;
			return keys.every((key) => key in right && deepEqualJson(left[key], right[key]));
		}
		/** Read a value at a dotted path ('' segments are ignored). */
		function getByPath(root, path) {
			let cursor = root;
			for (const segment of path.split(".")) {
				if (segment === "") continue;
				if (typeof cursor !== "object" || cursor === null) return void 0;
				cursor = cursor[segment];
			}
			return cursor;
		}
		/** Whether a value has an own key at a dotted path. */
		function hasByPath(root, path) {
			const segments = path.split(".").filter((segment) => segment !== "");
			if (segments.length === 0) return false;
			let cursor = root;
			for (let index = 0; index < segments.length; index++) {
				if (typeof cursor !== "object" || cursor === null) return false;
				const record = cursor;
				const segment = segments[index];
				if (index === segments.length - 1) return Object.hasOwn(record, segment);
				if (!Object.hasOwn(record, segment)) return false;
				cursor = record[segment];
			}
			return false;
		}
		/** Clone a plain JSON-shaped object (the merged root draft). */
		function clonePlain(value) {
			if (typeof value === "object" && value !== null && !Array.isArray(value)) return { ...value };
			return {};
		}
		/**
		* Stages one card's edits over one settings namespace and writes them on save.
		*
		* The Host is the only authority on whether a value was accepted — its
		* validators own the constraints no schema can express — so the outcome is
		* read back from the section rather than predicted here. A save that did not
		* land keeps its drafts, so the user can correct them instead of retyping.
		*/
		var CardForm = class {
			scope;
			specs;
			staged = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			/** The scope subscription installed in the constructor; released by dispose(). */
			disposeScope;
			disposed = false;
			saving = false;
			failed = false;
			failedReason;
			/** @param scope - the bound settings scope for this card's namespace. */
			constructor(scope, specs) {
				this.scope = scope;
				this.specs = new Map(specs.map((spec) => [spec.field, spec]));
				this.disposeScope = scope.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Release the scope subscription and every bound store listener. The card
			* must call this on teardown; later calls are no-ops.
			*/
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.disposeScope();
				this.listeners.clear();
			}
			/** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
			bind(project) {
				const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
				this.listeners.add(() => {
					store.set(project());
				});
				return store;
			}
			/** Read the card-level state: what the Host serves, and what a save would do. */
			shell() {
				const snapshot = this.scope.getSnapshot();
				const plan = this.plan();
				return {
					available: snapshot.status !== "loading",
					exposed: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: plan.length > 0,
					invalid: plan.some((item) => item.run === void 0),
					saving: this.saving,
					failed: this.failed,
					...this.failedReason === void 0 ? {} : { failedReason: this.failedReason }
				};
			}
			/** Read one field's state from the effective section and its staged draft. */
			field(field) {
				const spec = this.specOf(field);
				const staged = this.staged.get(field);
				if (staged === void 0) return {
					text: spec.format(this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			/** The actions the card's slot registration injects. */
			actions() {
				return {
					edit: (field, text) => {
						this.stage(field, {
							text,
							clear: false
						});
					},
					resetField: (field) => {
						this.stage(field, {
							text: this.specOf(field).format(this.baseValue(field)),
							clear: true
						});
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.failedReason = void 0;
						this.publish();
					}
				};
			}
			/**
			* Write every staged edit, then re-seed from what the Host accepted.
			* A field lands only when the Host reports it held the staged value; a
			* landed field's draft is dropped, a failed one stays staged for the user.
			* @returns settlement after every write and the read-back.
			*/
			async save() {
				const plan = this.plan();
				const valid = plan.filter((item) => item.run !== void 0);
				if (plan.length === 0 || this.saving || valid.length !== plan.length) return;
				const pending = /* @__PURE__ */ new Map();
				for (const item of plan) pending.set(item.field, this.staged.get(item.field));
				this.saving = true;
				this.failed = false;
				this.failedReason = void 0;
				this.publish();
				const landed = /* @__PURE__ */ new Set();
				for (const item of valid) if (await item.run()) landed.add(item.field);
				for (const [field, before] of pending) if (landed.has(field) && this.staged.get(field) === before) this.staged.delete(field);
				this.saving = false;
				this.failed = landed.size !== pending.size;
				this.publish();
			}
			/**
			* Every staged edit a save would write. Scalar fields write one op each;
			* object-rooted fields coalesce per root into one wholesale write of the
			* merged root object. An entry whose draft is not a value its field accepts
			* carries no write: the form is still dirty, and the save refuses rather
			* than dropping the edit.
			* @returns the planned writes, in the order the fields were staged.
			*/
			plan() {
				const plan = [];
				const groups = /* @__PURE__ */ new Map();
				for (const [field, staged] of this.staged) {
					const spec = this.specOf(field);
					if (spec.objectRoot !== void 0) {
						const list = groups.get(spec.objectRoot) ?? [];
						list.push({
							spec,
							staged
						});
						groups.set(spec.objectRoot, list);
						continue;
					}
					if (staged.clear) {
						if (this.stored(field)) plan.push({
							field,
							run: () => this.clear(field)
						});
						continue;
					}
					if (staged.text === spec.format(this.sectionValue(field))) continue;
					const write = spec.parse(staged.text);
					if (write === void 0) plan.push({
						field,
						run: void 0
					});
					else if (write.kind === "clear") plan.push({
						field,
						run: () => this.clear(field)
					});
					else plan.push({
						field,
						run: () => this.store(field, write.value)
					});
				}
				for (const [root, entries] of groups) plan.push(...this.planGroup(root, entries));
				return plan;
			}
			/** Coalesce one root's staged members into a single merged-object write. */
			planGroup(root, entries) {
				const fields = entries.map((entry) => entry.spec.field);
				const merged = clonePlain(this.sectionValue(root));
				let changed = false;
				let hasSecret = false;
				let invalid = false;
				for (const { spec, staged } of entries) {
					if (spec.secret === true) hasSecret = true;
					const member = spec.field.slice(root.length + 1);
					if (staged.clear) {
						if (Object.hasOwn(merged, member)) {
							delete merged[member];
							changed = true;
						}
						continue;
					}
					const write = spec.parse(staged.text);
					if (write === void 0) {
						invalid = true;
						continue;
					}
					if (write.kind === "clear") {
						if (Object.hasOwn(merged, member)) {
							delete merged[member];
							changed = true;
						}
					} else if (merged[member] !== write.value) {
						merged[member] = write.value;
						changed = true;
					}
				}
				if (!changed) return [];
				const run = invalid ? void 0 : () => this.storeObject(root, merged, hasSecret);
				return fields.map((field) => ({
					field,
					run
				}));
			}
			async clear(field) {
				await this.scope.unset(field);
				return !this.stored(field);
			}
			async store(field, value) {
				await this.scope.set(field, value);
				if (this.specOf(field).secret) return true;
				return getByPath(this.userLayer(), field) === value;
			}
			/** Write one root object wholesale (the official scope is single-segment). */
			async storeObject(root, value, hasSecret) {
				await this.scope.set(root, value);
				if (hasSecret) return true;
				return deepEqualJson(getByPath(this.userLayer(), root), value);
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				this.failedReason = void 0;
				this.publish();
			}
			specOf(field) {
				const spec = this.specs.get(field);
				if (spec === void 0) throw new Error(`settings card has no field ${field}`);
				return spec;
			}
			snapshotOf() {
				return this.scope.getSnapshot();
			}
			sectionValue(field) {
				return getByPath(this.snapshotOf().value, field);
			}
			baseValue(field) {
				return getByPath(this.snapshotOf().base, field);
			}
			userLayer() {
				return this.snapshotOf().user;
			}
			stored(field) {
				return hasByPath(this.userLayer(), field);
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region \0dsh-css:D:\Deepseek Harness\dsh-evolve-in-git\src\client\settings-section.module.css.mjs
		const css = "._6iOaHq_sectionList{margin:0;padding:0;list-style:none}";
		const tagId = "dsh-evolve-in-git/settings-section.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-evolve-in-git";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_section_module_css_default = { "sectionList": "_6iOaHq_sectionList" };
		//#endregion
		//#region src/client/EvolveSettingsCard.tsx
		/** Bridges the 'evolve-git' scope onto the card's staged form. */
		var EvolveSettingsCardController = class {
			form;
			store;
			/** @param scope - the bound settings scope for the 'evolve-git' namespace. */
			constructor(scope) {
				this.form = new CardForm(scope, [
					textField("repoPath"),
					textField("repoUrl"),
					objectField(choiceField("auth.mode", ["ssh", "token"]), "auth"),
					objectField(textField("auth.sshCommand"), "auth"),
					objectField(textField("auth.tokenEnv"), "auth"),
					objectField(secretField("auth.token"), "auth"),
					objectField(textField("auth.username"), "auth"),
					textField("memoryRoot"),
					textField("skillsRoot"),
					textField("defaultBranch"),
					textField("remoteName"),
					booleanField("autoCommit"),
					textField("archiveRoot"),
					numberField("recallTopK", {
						integer: true,
						min: 1
					}),
					numberField("recallMinScore", { min: 0 }),
					numberField("recallMaxChars", {
						integer: true,
						min: 0
					}),
					choiceField("privacyMode", [
						"block",
						"redact",
						"ask"
					]),
					booleanField("digestEnabled"),
					numberField("digestMaxRecords", {
						integer: true,
						min: 0
					}),
					numberField("digestMaxChars", {
						integer: true,
						min: 0
					})
				]);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					repoPath: this.form.field("repoPath"),
					repoUrl: this.form.field("repoUrl"),
					authMode: this.form.field("auth.mode"),
					authSshCommand: this.form.field("auth.sshCommand"),
					authTokenEnv: this.form.field("auth.tokenEnv"),
					authToken: this.form.field("auth.token"),
					authUsername: this.form.field("auth.username"),
					memoryRoot: this.form.field("memoryRoot"),
					skillsRoot: this.form.field("skillsRoot"),
					defaultBranch: this.form.field("defaultBranch"),
					remoteName: this.form.field("remoteName"),
					autoCommit: this.form.field("autoCommit"),
					archiveRoot: this.form.field("archiveRoot"),
					recallTopK: this.form.field("recallTopK"),
					recallMinScore: this.form.field("recallMinScore"),
					recallMaxChars: this.form.field("recallMaxChars"),
					privacyMode: this.form.field("privacyMode"),
					digestEnabled: this.form.field("digestEnabled"),
					digestMaxRecords: this.form.field("digestMaxRecords"),
					digestMaxChars: this.form.field("digestMaxChars")
				};
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { evolveSettingsCard: this.store },
					...this.form.actions()
				};
			}
			/**
			* Release the card's scope subscription and bound stores; the slot
			* disposer calls this on teardown.
			*/
			dispose() {
				this.form.dispose();
			}
		};
		/**
		* Render the evolve settings card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function EvolveSettingsCard(props) {
			const { t } = props;
			const state = props.useEvolveSettingsCard((snapshot) => snapshot);
			const disabled = !state.writable;
			const fieldProps = {
				overriddenLabel: t("settings.overridden"),
				resetLabel: t("settings.reset"),
				invalidLabel: t("settings.invalidNumber"),
				disabled
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PluginSettingsCard, {
				t,
				titleKey: "settings.title",
				descriptionKey: "settings.description",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				alwaysOpen: true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-repo-path",
						label: t("field.repoPath"),
						hint: t("field.repoPath.hint"),
						...fieldProps,
						...state.repoPath,
						onEdit: (text) => {
							props.edit("repoPath", text);
						},
						onReset: () => {
							props.resetField("repoPath");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-repo-url",
						label: t("field.repoUrl"),
						hint: t("field.repoUrl.hint"),
						...fieldProps,
						...state.repoUrl,
						onEdit: (text) => {
							props.edit("repoUrl", text);
						},
						onReset: () => {
							props.resetField("repoUrl");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceField, {
						id: "settings-evolve-git-auth-mode",
						label: t("field.authMode"),
						hint: t("field.authMode.hint"),
						inheritLabel: t("settings.inherit"),
						...fieldProps,
						...state.authMode,
						choices: [{
							value: "ssh",
							label: t("field.authMode.ssh")
						}, {
							value: "token",
							label: t("field.authMode.token")
						}],
						onEdit: (text) => {
							props.edit("auth.mode", text);
						},
						onReset: () => {
							props.resetField("auth.mode");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-auth-ssh-command",
						label: t("field.authSshCommand"),
						hint: t("field.authSshCommand.hint"),
						...fieldProps,
						...state.authSshCommand,
						onEdit: (text) => {
							props.edit("auth.sshCommand", text);
						},
						onReset: () => {
							props.resetField("auth.sshCommand");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-auth-token-env",
						label: t("field.authTokenEnv"),
						hint: t("field.authTokenEnv.hint"),
						...fieldProps,
						...state.authTokenEnv,
						onEdit: (text) => {
							props.edit("auth.tokenEnv", text);
						},
						onReset: () => {
							props.resetField("auth.tokenEnv");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-auth-token",
						label: t("field.authToken"),
						hint: t("field.authToken.hint"),
						...fieldProps,
						...state.authToken,
						onEdit: (text) => {
							props.edit("auth.token", text);
						},
						onReset: () => {
							props.resetField("auth.token");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-auth-username",
						label: t("field.authUsername"),
						hint: t("field.authUsername.hint"),
						...fieldProps,
						...state.authUsername,
						onEdit: (text) => {
							props.edit("auth.username", text);
						},
						onReset: () => {
							props.resetField("auth.username");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-memory-root",
						label: t("field.memoryRoot"),
						hint: t("field.memoryRoot.hint"),
						...fieldProps,
						...state.memoryRoot,
						onEdit: (text) => {
							props.edit("memoryRoot", text);
						},
						onReset: () => {
							props.resetField("memoryRoot");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-skills-root",
						label: t("field.skillsRoot"),
						hint: t("field.skillsRoot.hint"),
						...fieldProps,
						...state.skillsRoot,
						onEdit: (text) => {
							props.edit("skillsRoot", text);
						},
						onReset: () => {
							props.resetField("skillsRoot");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-default-branch",
						label: t("field.defaultBranch"),
						hint: t("field.defaultBranch.hint"),
						...fieldProps,
						...state.defaultBranch,
						onEdit: (text) => {
							props.edit("defaultBranch", text);
						},
						onReset: () => {
							props.resetField("defaultBranch");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-remote-name",
						label: t("field.remoteName"),
						hint: t("field.remoteName.hint"),
						...fieldProps,
						...state.remoteName,
						onEdit: (text) => {
							props.edit("remoteName", text);
						},
						onReset: () => {
							props.resetField("remoteName");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
						id: "settings-evolve-git-auto-commit",
						label: t("field.autoCommit"),
						hint: t("field.autoCommit.hint"),
						inheritLabel: t("settings.inherit"),
						onLabel: t("settings.on"),
						offLabel: t("settings.off"),
						...fieldProps,
						...state.autoCommit,
						onEdit: (text) => {
							props.edit("autoCommit", text);
						},
						onReset: () => {
							props.resetField("autoCommit");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-archive-root",
						label: t("field.archiveRoot"),
						hint: t("field.archiveRoot.hint"),
						...fieldProps,
						...state.archiveRoot,
						onEdit: (text) => {
							props.edit("archiveRoot", text);
						},
						onReset: () => {
							props.resetField("archiveRoot");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-recall-top-k",
						label: t("field.recallTopK"),
						hint: t("field.recallTopK.hint"),
						...fieldProps,
						...state.recallTopK,
						onEdit: (text) => {
							props.edit("recallTopK", text);
						},
						onReset: () => {
							props.resetField("recallTopK");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-recall-min-score",
						label: t("field.recallMinScore"),
						hint: t("field.recallMinScore.hint"),
						...fieldProps,
						...state.recallMinScore,
						onEdit: (text) => {
							props.edit("recallMinScore", text);
						},
						onReset: () => {
							props.resetField("recallMinScore");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-recall-max-chars",
						label: t("field.recallMaxChars"),
						hint: t("field.recallMaxChars.hint"),
						...fieldProps,
						...state.recallMaxChars,
						onEdit: (text) => {
							props.edit("recallMaxChars", text);
						},
						onReset: () => {
							props.resetField("recallMaxChars");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceField, {
						id: "settings-evolve-git-privacy-mode",
						label: t("field.privacyMode"),
						hint: t("field.privacyMode.hint"),
						inheritLabel: t("settings.inherit"),
						...fieldProps,
						...state.privacyMode,
						choices: [
							{
								value: "block",
								label: t("field.privacyMode.block")
							},
							{
								value: "redact",
								label: t("field.privacyMode.redact")
							},
							{
								value: "ask",
								label: t("field.privacyMode.ask")
							}
						],
						onEdit: (text) => {
							props.edit("privacyMode", text);
						},
						onReset: () => {
							props.resetField("privacyMode");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
						id: "settings-evolve-git-digest-enabled",
						label: t("field.digestEnabled"),
						hint: t("field.digestEnabled.hint"),
						inheritLabel: t("settings.inherit"),
						onLabel: t("settings.on"),
						offLabel: t("settings.off"),
						...fieldProps,
						...state.digestEnabled,
						onEdit: (text) => {
							props.edit("digestEnabled", text);
						},
						onReset: () => {
							props.resetField("digestEnabled");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-digest-max-records",
						label: t("field.digestMaxRecords"),
						hint: t("field.digestMaxRecords.hint"),
						...fieldProps,
						...state.digestMaxRecords,
						onEdit: (text) => {
							props.edit("digestMaxRecords", text);
						},
						onReset: () => {
							props.resetField("digestMaxRecords");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "settings-evolve-git-digest-max-chars",
						label: t("field.digestMaxChars"),
						hint: t("field.digestMaxChars.hint"),
						...fieldProps,
						...state.digestMaxChars,
						onEdit: (text) => {
							props.edit("digestMaxChars", text);
						},
						onReset: () => {
							props.resetField("digestMaxChars");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfigFileEditor, { t })
				]
			});
		}
		/** Render the evolve settings card as a first-level settings page. */
		function EvolveSettingsSection(props) {
			const { t, useEvolveSettingsCard, save, discard, edit, resetField } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: settings_section_module_css_default.sectionList,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EvolveSettingsCard, {
					t,
					useEvolveSettingsCard,
					save,
					discard,
					edit,
					resetField
				})
			});
		}
		/** The two dictionaries, keyed by language. */
		const dictionaries = {
			zh: {
				"settings.title": "演进记忆 (EvolveInGit)",
				"settings.description": "Git 记忆仓库、认证与存储布局。",
				"settings.nav": "演进记忆",
				"settings.inherit": "继承",
				"settings.on": "开",
				"settings.off": "关",
				"settings.overridden": "已覆盖",
				"settings.reset": "恢复默认",
				"settings.notExposed": "当前 DSH 版本未向设置页暴露本插件的配置命名空间，表单不可用。可编辑 ~/.dsh/settings.yaml 直接配置，或为 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单补充本命名空间后重启。",
				"settings.readOnly": "当前部署的设置只读。",
				"settings.expand": "展开设置",
				"settings.collapse": "收起设置",
				"settings.save": "保存",
				"settings.saving": "保存中…",
				"settings.discard": "放弃",
				"settings.unsaved": "未保存",
				"settings.saveFailed": "部署未接受这些值，已保留供你修改。",
				"settings.invalidNumber": "请输入数字，留空则使用默认值。",
				"field.repoPath": "记忆仓库路径",
				"field.repoPath.hint": "本地 Git 检出目录，记忆与技能写入这里。留空继承默认 ~/.dsh-evolve-in-git/remote-memory。",
				"field.repoUrl": "远程仓库 URL",
				"field.repoUrl.hint": "远程记忆仓库地址；连接时会校验本地 remote 是否指向它。",
				"field.authMode": "认证方式",
				"field.authMode.hint": "ssh：使用本机 SSH（或自定义 sshCommand）；token：使用 GitHub 风格 Authorization 头。",
				"field.authMode.ssh": "SSH",
				"field.authMode.token": "Token",
				"field.authSshCommand": "SSH 命令",
				"field.authSshCommand.hint": "例如 \"ssh\" 或 \"ssh -i ~/.ssh/id_ed25519\"。",
				"field.authTokenEnv": "Token 环境变量",
				"field.authTokenEnv.hint": "读取该环境变量作为访问令牌（如 GITHUB_TOKEN）。",
				"field.authToken": "访问令牌",
				"field.authToken.hint": "直接填写的令牌；只写不读，留空保持现有令牌。",
				"field.authUsername": "Token 用户名",
				"field.authUsername.hint": "Authorization 头的用户名部分，默认 x-access-token。",
				"field.memoryRoot": "记忆存储根",
				"field.memoryRoot.hint": "仓库内记忆记录写入的相对目录，默认 .dsh-evolve/memory。",
				"field.skillsRoot": "技能草稿根",
				"field.skillsRoot.hint": "仓库内技能草稿写入的相对目录，默认 .dsh-evolve/skills。",
				"field.defaultBranch": "默认分支",
				"field.defaultBranch.hint": "新建演进分支时的基线分支，默认 main。",
				"field.remoteName": "远程名",
				"field.remoteName.hint": "fetch/push 使用的 remote，默认 origin。",
				"field.autoCommit": "写入后自动提交",
				"field.autoCommit.hint": "开：每次记忆/技能写入自动 git commit；关：只落盘文件。",
				"field.archiveRoot": "归档目录",
				"field.archiveRoot.hint": "遗忘（forget）时记录移动到的仓库内相对目录，默认 .dsh-evolve/archive。",
				"field.recallTopK": "召回条数上限",
				"field.recallTopK.hint": "evolve_recall 单次最多返回的条数，默认 10。",
				"field.recallMinScore": "召回最低分数",
				"field.recallMinScore.hint": "低于该相关性分数的记忆被过滤，默认 0。",
				"field.recallMaxChars": "召回正文字符预算",
				"field.recallMaxChars.hint": "返回正文的累计字符上限，默认 8000。",
				"field.privacyMode": "隐私写入门禁",
				"field.privacyMode.hint": "敏感内容写入策略：block 拒绝写入；redact 脱敏后写入（不落盘明文）；ask 照常写入并标注敏感级别（默认）。",
				"field.privacyMode.block": "拒绝 (block)",
				"field.privacyMode.redact": "脱敏 (redact)",
				"field.privacyMode.ask": "询问 (ask)",
				"field.digestEnabled": "会话起始摘要",
				"field.digestEnabled.hint": "开：会话起始注入 persona+warning 摘要；关：不注入。",
				"field.digestMaxRecords": "摘要记录上限",
				"field.digestMaxRecords.hint": "会话起始摘要最多包含的 persona/warning 记录数，默认 5。",
				"field.digestMaxChars": "摘要字符预算",
				"field.digestMaxChars.hint": "会话起始摘要的最大字符数，默认 2000。",
				"configFile.title": "配置文件 (evolve-in-git.json)",
				"configFile.description": "直接编辑本机的配置文件（每个 DSH 用户各有一份，不在任何 Git 仓库中）。保存后立即生效，优先级高于上方表单与默认值。",
				"configFile.loading": "读取中…",
				"configFile.saving": "保存中…",
				"configFile.save": "保存",
				"configFile.reload": "重新加载",
				"configFile.saved": "已保存：{path}",
				"configFile.error": "失败：{error}",
				"configFile.empty": "（文件尚不存在，保存将新建）"
			},
			en: {
				"settings.title": "EvolveInGit memory",
				"settings.description": "Git memory repository, authentication, and storage layout.",
				"settings.nav": "Evolve memory",
				"settings.inherit": "Inherit",
				"settings.on": "On",
				"settings.off": "Off",
				"settings.overridden": "Overridden",
				"settings.reset": "Reset to default",
				"settings.notExposed": "This DSH version does not expose this plugin's settings namespace to the configuration page, so the form is unavailable. Edit ~/.dsh/settings.yaml directly, or add the namespace to dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES allowlist and restart.",
				"settings.readOnly": "This deployment stores settings read-only.",
				"settings.expand": "Show settings",
				"settings.collapse": "Hide settings",
				"settings.save": "Save",
				"settings.saving": "Saving…",
				"settings.discard": "Discard",
				"settings.unsaved": "Unsaved",
				"settings.saveFailed": "The deployment did not accept these values; they were left for you to correct.",
				"settings.invalidNumber": "Enter a number, or leave blank to use the default.",
				"field.repoPath": "Memory repository path",
				"field.repoPath.hint": "Local Git checkout where memory and skills are written. Empty inherits ~/.dsh-evolve-in-git/remote-memory.",
				"field.repoUrl": "Remote repository URL",
				"field.repoUrl.hint": "Remote memory repository; connect verifies the local remote points here.",
				"field.authMode": "Auth mode",
				"field.authMode.hint": "ssh: local SSH (or a custom sshCommand); token: GitHub-style Authorization header.",
				"field.authMode.ssh": "SSH",
				"field.authMode.token": "Token",
				"field.authSshCommand": "SSH command",
				"field.authSshCommand.hint": "e.g. \"ssh\" or \"ssh -i ~/.ssh/id_ed25519\".",
				"field.authTokenEnv": "Token environment variable",
				"field.authTokenEnv.hint": "Env var read as the access token (e.g. GITHUB_TOKEN).",
				"field.authToken": "Access token",
				"field.authToken.hint": "Token written directly; write-only — leave empty to keep the current token.",
				"field.authUsername": "Token username",
				"field.authUsername.hint": "Username part of the Authorization header, default x-access-token.",
				"field.memoryRoot": "Memory root",
				"field.memoryRoot.hint": "Relative directory for memory records, default .dsh-evolve/memory.",
				"field.skillsRoot": "Skills root",
				"field.skillsRoot.hint": "Relative directory for skill drafts, default .dsh-evolve/skills.",
				"field.defaultBranch": "Default branch",
				"field.defaultBranch.hint": "Baseline branch for new evolution branches, default main.",
				"field.remoteName": "Remote name",
				"field.remoteName.hint": "Remote used for fetch/push, default origin.",
				"field.autoCommit": "Auto-commit writes",
				"field.autoCommit.hint": "On: every memory/skill write runs git commit; off: files are written only.",
				"field.archiveRoot": "Archive root",
				"field.archiveRoot.hint": "Repo-relative directory forgotten records are moved into, default .dsh-evolve/archive.",
				"field.recallTopK": "Recall result limit",
				"field.recallTopK.hint": "Maximum results evolve_recall returns, default 10.",
				"field.recallMinScore": "Recall minimum score",
				"field.recallMinScore.hint": "Memories scoring below this are filtered out, default 0.",
				"field.recallMaxChars": "Recall content budget",
				"field.recallMaxChars.hint": "Cumulative character budget for returned content, default 8000.",
				"field.privacyMode": "Privacy write gate",
				"field.privacyMode.hint": "Sensitive-content write policy: block rejects the write; redact stores redacted content (never plaintext); ask stores as-is with a sensitivity flag (default).",
				"field.privacyMode.block": "Block",
				"field.privacyMode.redact": "Redact",
				"field.privacyMode.ask": "Ask",
				"field.digestEnabled": "Session-start digest",
				"field.digestEnabled.hint": "On: inject a persona+warning digest at session start; off: no injection.",
				"field.digestMaxRecords": "Digest record limit",
				"field.digestMaxRecords.hint": "Maximum persona/warning records in the session-start digest, default 5.",
				"field.digestMaxChars": "Digest character budget",
				"field.digestMaxChars.hint": "Maximum characters of the session-start digest, default 2000.",
				"configFile.title": "Config file (evolve-in-git.json)",
				"configFile.description": "Edit this machine's config file directly (one per DSH user; never part of any Git repository). Saves apply immediately and take priority over the form above and the defaults.",
				"configFile.loading": "Loading…",
				"configFile.saving": "Saving…",
				"configFile.save": "Save",
				"configFile.reload": "Reload",
				"configFile.saved": "Saved: {path}",
				"configFile.error": "Failed: {error}",
				"configFile.empty": "(file does not exist yet; saving creates it)"
			}
		};
		//#endregion
		//#region src/client/index.tsx
		/** Locale namespace of the browser half (matches the plugin package id). */
		const NS = "evolve-git";
		/** Required services: slots for the settings section and locale for the copy. The form reads the config file directly. */
		const inject = ["slots", "locale"];
		/** Apply the browser half. */
		function apply(ctx) {
			ctx.effect(() => {
				try {
					return ctx.locale.register(NS, dictionaries);
				} catch {
					return () => {};
				}
			}, "dsh-evolve-in-git: dictionaries");
			const configScope = new ConfigFileScope();
			ctx.effect(() => {
				configScope.load();
				return () => {};
			}, "dsh-evolve-in-git: config load");
			const controller = new EvolveSettingsCardController(configScope);
			ctx.slots.inject("settings.section", () => {
				try {
					const unregister = ctx.slots.register({
						name: "settings.section",
						id: "evolve-git",
						order: 120,
						label: () => ctx.locale.bind(NS)("settings.nav"),
						locale: NS,
						inject: () => controller.inject()
					}, EvolveSettingsSection);
					return () => {
						unregister();
						controller.dispose();
						configScope.dispose();
					};
				} catch {
					return () => {};
				}
			});
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map