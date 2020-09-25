/**
 * --------------------------------------------------------------------------
 * Bootstrap (v5.0.0-alpha1): toast.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import {
  getjQuery,
  TRANSITION_END,
  emulateTransitionEnd,
  getTransitionDurationFromElement,
  reflow,
  typeCheckConfig
} from './util/index'
import Data from './dom/data'
import EventHandler from './dom/event-handler'
import Manipulator from './dom/manipulator'
import SelectorEngine from './dom/selector-engine'

/**
 * ------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------
 */

const NAME = 'toast'
const VERSION = '5.0.0-alpha1'
const DATA_KEY = 'bs.toast'
const EVENT_KEY = `.${DATA_KEY}`

const EVENT_CLICK_DISMISS = `click.dismiss${EVENT_KEY}`
const EVENT_HIDE = `hide${EVENT_KEY}`
const EVENT_HIDDEN = `hidden${EVENT_KEY}`
const EVENT_SHOW = `show${EVENT_KEY}`
const EVENT_SHOWN = `shown${EVENT_KEY}`

const CLASS_NAME_FADE = 'fade'
const CLASS_NAME_SHOW = 'show'
const CLASS_NAME_SHOWING = 'showing'
const PositionMap = {
  TOP_CENTER: 'top-center',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right'
}

const DefaultType = {
  animation: 'boolean',
  autohide: 'boolean',
  delay: 'number',
  position: 'string',
  positionMargin: 'number'
}

const Default = {
  animation: true,
  autohide: true,
  delay: 5000,
  position: PositionMap.TOP_RIGHT,
  positionMargin: 10
}

const SELECTOR_DATA_DISMISS = '[data-dismiss="toast"]'

/**
 * ------------------------------------------------------------------------
 * Class Definition
 * ------------------------------------------------------------------------
 */

class Toast {
  constructor(element, config) {
    this._element = element
    this._config = this._getConfig(config)
    this._timeout = null
    this._setListeners()
    Data.setData(element, DATA_KEY, this)
  }

  // Getters

  static get VERSION() {
    return VERSION
  }

  static get DefaultType() {
    return DefaultType
  }

  static get Default() {
    return Default
  }

  // Public

  get config() {
    return this._config
  }

  show() {
    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW)

    if (showEvent.defaultPrevented) {
      return
    }

    this._clearTimeout()

    if (this._config.animation) {
      this._element.classList.add(CLASS_NAME_FADE)
    }

    const complete = () => {
      this._element.classList.remove(CLASS_NAME_SHOWING)
      this._element.classList.add(CLASS_NAME_SHOW)

      EventHandler.trigger(this._element, EVENT_SHOWN)

      if (this._config.autohide) {
        this._timeout = setTimeout(() => {
          this.hide()
        }, this._config.delay)
      }
    }

    this._positionToast()
    reflow(this._element)
    this._element.classList.add(CLASS_NAME_SHOWING)
    if (this._config.animation) {
      const transitionDuration = getTransitionDurationFromElement(this._element)

      EventHandler.one(this._element, TRANSITION_END, complete)
      emulateTransitionEnd(this._element, transitionDuration)
    } else {
      complete()
    }
  }

  hide() {
    if (!this._element.classList.contains(CLASS_NAME_SHOW)) {
      return
    }

    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE)

    if (hideEvent.defaultPrevented) {
      return
    }

    const complete = () => {
      this._clearPositioning()
      this._repositionExistingToasts()
      EventHandler.trigger(this._element, EVENT_HIDDEN)
    }

    this._element.classList.remove(CLASS_NAME_SHOW)
    if (this._config.animation) {
      const transitionDuration = getTransitionDurationFromElement(this._element)

      EventHandler.one(this._element, TRANSITION_END, complete)
      emulateTransitionEnd(this._element, transitionDuration)
    } else {
      complete()
    }
  }

  dispose() {
    this._clearTimeout()

    if (this._element.classList.contains(CLASS_NAME_SHOW)) {
      this._element.classList.remove(CLASS_NAME_SHOW)
    }

    EventHandler.off(this._element, EVENT_CLICK_DISMISS)
    Data.removeData(this._element, DATA_KEY)

    this._element = null
    this._config = null
  }

  // Private

  _positionToast() {
    this._element.style.position = 'absolute'
    const toastList = SelectorEngine.find(`.toast.${this._config.position}`, this._element.parentNode)

    if (this._config.position.indexOf('top-') > -1) {
      const top = toastList.reduce((top, toastEl) => {
        const { height, marginBottom } = window.getComputedStyle(toastEl)

        top += (parseInt(height, 10) + parseInt(marginBottom, 10))
        return top
      }, this._config.positionMargin)

      if (this._config.position === PositionMap.TOP_RIGHT) {
        this._element.classList.add(PositionMap.TOP_RIGHT)
        this._element.style.right = `${this._config.positionMargin}px`
      } else if (this._config.position === PositionMap.TOP_LEFT) {
        this._element.classList.add(PositionMap.TOP_LEFT)
        this._element.style.left = `${this._config.positionMargin}px`
      } else {
        const leftPx = this._getMiddleToastPosition()

        this._element.classList.add(PositionMap.TOP_CENTER)
        this._element.style.left = `${leftPx}px`
      }

      this._element.style.top = `${top}px`
      return
    }

    if (this._config.position.indexOf('bottom-') > -1) {
      const bottom = toastList.reduce((bottom, toastEl) => {
        const { height, marginTop } = window.getComputedStyle(toastEl)

        bottom += (parseInt(height, 10) + parseInt(marginTop, 10))
        return bottom
      }, this._config.positionMargin)

      if (this._config.position === PositionMap.BOTTOM_RIGHT) {
        this._element.classList.add(PositionMap.BOTTOM_RIGHT)
        this._element.style.right = `${this._config.positionMargin}px`
      } else if (this._config.position === PositionMap.BOTTOM_LEFT) {
        this._element.classList.add(PositionMap.BOTTOM_LEFT)
        this._element.style.left = `${this._config.positionMargin}px`
      } else {
        const leftPx = this._getMiddleToastPosition()

        this._element.classList.add(PositionMap.BOTTOM_CENTER)
        this._element.style.left = `${leftPx}px`
      }

      this._element.style.bottom = `${bottom}px`
    }
  }

  _repositionExistingToasts() {
    const toastList = SelectorEngine.find(`.toast.${this._config.position}`, this._element.parentNode)

    toastList.forEach((toastEl, index) => {
      const toastInstance = Toast.getInstance(toastEl)

      if (toastInstance.config.position.indexOf('top-') > -1) {
        let top = toastInstance.config.positionMargin

        if (index > 0) {
          const previousToast = toastList[index - 1]
          const { height, marginBottom } = window.getComputedStyle(previousToast)

          top += (parseInt(height, 10) + parseInt(marginBottom, 10))
        }

        toastEl.style.top = `${top}px`
      }

      if (toastInstance.config.position.indexOf('bottom-') > -1) {
        let bottom = toastInstance.config.positionMargin

        if (index > 0) {
          const previousToast = toastList[index - 1]
          const { height, marginTop } = window.getComputedStyle(previousToast)

          bottom += (parseInt(height, 10) + parseInt(marginTop, 10))
        }

        toastEl.style.bottom = `${bottom}px`
      }
    })
  }

  _clearPositioning() {
    this._element.style.position = ''

    this._element.style.right = ''
    this._element.style.left = ''
    this._element.style.bottom = ''
    this._element.style.top = ''
    this._element.classList.remove(PositionMap.TOP_RIGHT)
    this._element.classList.remove(PositionMap.TOP_LEFT)
    this._element.classList.remove(PositionMap.TOP_CENTER)
    this._element.classList.remove(PositionMap.BOTTOM_LEFT)
    this._element.classList.remove(PositionMap.BOTTOM_RIGHT)
    this._element.classList.remove(PositionMap.BOTTOM_CENTER)
  }

  _getMiddleToastPosition() {
    const { width: computedWidthToast } = window.getComputedStyle(this._element)
    const { width: computedWidthContainer } = window.getComputedStyle(this._element.parentNode)
    const widthContainer = parseInt(
      computedWidthContainer === 'auto' ? window.innerWidth : computedWidthContainer,
      10
    )
    const widthToast = parseInt(
      computedWidthToast === 'auto' ? widthContainer : computedWidthToast,
      10
    )
    const middleContainerWidth = widthContainer / 2
    const middleToastWidth = widthToast / 2

    return middleContainerWidth > middleToastWidth ? middleContainerWidth - middleToastWidth : 0
  }

  _getConfig(config) {
    config = {
      ...Default,
      ...Manipulator.getDataAttributes(this._element),
      ...(typeof config === 'object' && config ? config : {})
    }

    typeCheckConfig(NAME, config, this.constructor.DefaultType)

    return config
  }

  _setListeners() {
    EventHandler.on(this._element, EVENT_CLICK_DISMISS, SELECTOR_DATA_DISMISS, () => this.hide())
  }

  _clearTimeout() {
    clearTimeout(this._timeout)
    this._timeout = null
  }

  // Static

  static jQueryInterface(config) {
    return this.each(function () {
      let data = Data.getData(this, DATA_KEY)
      const _config = typeof config === 'object' && config

      if (!data) {
        data = new Toast(this, _config)
      }

      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new TypeError(`No method named "${config}"`)
        }

        data[config](this)
      }
    })
  }

  static getInstance(element) {
    return Data.getData(element, DATA_KEY)
  }
}

const $ = getjQuery()

/**
 * ------------------------------------------------------------------------
 * jQuery
 * ------------------------------------------------------------------------
 *  add .toast to jQuery only if jQuery is present
 */
/* istanbul ignore if */
if ($) {
  const JQUERY_NO_CONFLICT = $.fn[NAME]
  $.fn[NAME] = Toast.jQueryInterface
  $.fn[NAME].Constructor = Toast
  $.fn[NAME].noConflict = () => {
    $.fn[NAME] = JQUERY_NO_CONFLICT
    return Toast.jQueryInterface
  }
}

export default Toast
