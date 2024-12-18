import { intersectionObserver } from "./observer.js";
/**
 * Standard Margin between cards
 * @type {number}
 */
const MARGIN = 16;

/**
 * Returns top and bottom observer elements
 * @returns {[HTMLElement,HTMLElement]}
 */
const getObservers = () => [
    document.getElementById('top-observer'),
    document.getElementById('bottom-observer')
]

/**
 * Returns a virtual list container
 * @returns {HTMLElement}
 */
function getVirtualList() {
    return document.getElementById('virtual-list');
}

/**
 * Returns a main app container
 * @returns {HTMLElement}
 */
function getContainer() {
    return document.getElementById('container');
}

/**
 * Returns `data-y` attribute of the HTMLElement, if value is provided
 * additionally updates the attribute
 *
 * @param element {HTMLElement}
 * @param value {string | number}
 * @returns {?number}
 */
function y(element, value = undefined) {
    if (value != null) {
        element?.setAttribute('data-y', value);
    }
    const y = element?.getAttribute('data-y');
    if (y !== '' && y != null && +y === +y) {
        return +y;
    }
    return null;
}

/**
 * Returns a CSS Transform Style string to Move Element by certain amount of pixels
 * @param value      - value in pixels
 * @returns {string}
 */
function translateY(value) {
    return `translateY(${value}px)`;
}

/**
 * Starter skeleton
 */
export class VirtualList {
    /**
     * @param root
     * @param props {{
     *     getPage: <T>(p: number) => Promise<T[]>,
     *     getTemplate: <T>(datum: T) => HTMLElement,
     *     updateTemplate: <T>(datum: T, element: HTMLElement) => HTMLElement,
     *     pageSize: number
     * }}
     */
    constructor(root, props) {
        this.props = { ...props };
        this.root = root;
        this.end = 0;
        this.start = 0;
        this.limit = props.pageSize * 2;
        this.pool = [];
    }

    /**
     * Returns an HTML Representation of the component, should have the following structure:
     * #container>
     *    #top-observer+
     *    #virtual-list+
     *    #bottom-observer
     * @returns {string}
     */
    toHTML() {
        /**
         * Part 1 - App Skeleton
         *  @todo
         */
        return `<div id="container">
            <div id="top-observer">Top Observer</div>
            <div id="virtual-list"></div>
            <div id="bottom-observer">Bottom Observer</div>
        </div>`.trim();
    }

    /**
     * @returns void
     */
    #effect() {
        intersectionObserver(
            getObservers(),
            (entries) => { this.#handleIntersectionObserver(entries) },
            {
                threshold: 0.2,
            }
        )
    }

    /**
     * @returns void
     */
    render() {
        this.root.innerHTML = this.toHTML();
        this.#effect()
    }

    /**
     * Handles observer intersection entries
     * @param entries {IntersectionObserverEntry[]}
     */
    #handleIntersectionObserver(entries) {
        for (let entry of entries) {
            if (entry.isIntersecting) {
                if (entry.target.id === 'top-observer' && this.start > 0) {
                    this.#handleTopObserver(entry)
                } else if(entry.target.id === 'bottom-observer'){
                    this.#handleBottomObserver(entry)
                }
            }
        }

    }

    async #handleBottomObserver() {
        const data = await this.props.getPage(this.end++);
        if (this.pool.length < this.limit) {
            let list = getVirtualList()
            const fragment = new DocumentFragment();
            for (let datum of data) {
                const card = this.props.getTemplate(datum)
                fragment.appendChild(card)
                this.pool.push(card)
            }
            list.appendChild(fragment)
        } else {
            const [toRecycle, unchanged] = [
                this.pool.slice(0, this.props.pageSize),
                this.pool.slice(this.props.pageSize)
            ]
            this.pool = unchanged.concat(toRecycle)
            this.#updateData(toRecycle, data)
            this.start++
        }
        this.#updateElementsPosition("down")
    }

    async #handleTopObserver() {
        this.start--;
        this.end--;
        const data = await this.props.getPage(this.start)
        const [unchanged, toRecycle] = [
            this.pool.slice(0, this.props.pageSize),
            this.pool.slice(this.props.pageSize)
        ]
        this.pool = toRecycle.concat(unchanged)
        this.#updateData(toRecycle, data)
        this.#updateElementsPosition("top")
    }

    /**
     * Function uses `props.getTemplate` to update the html elements
     * using provided data
     *
     * @param elements {HTMLElement[]} - HTML Elements to update
     * @param data {T[]} - Data to use for update
     */
    #updateData(elements, data) {
        for (let i = 0; i < data.length; i++) {
            this.props.updateTemplate(data[i], elements[i])
        }
    }

    /**
     * Move elements on the screen using CSS Transform
     *
     * @param direction {"top" | "down" }
     */
    #updateElementsPosition(direction) {
        const [top, bottom] = getObservers();
        if (direction === 'down') {
            for (let i = 0; i < this.pool.length; i++) {
                const [previousElem, current] = [this.pool.at(i - 1), this.pool[i]]
                if (y(previousElem) === null) {
                    y(current, 0)
                } else {
                    const newY = y(previousElem) + MARGIN * 2 + previousElem.getBoundingClientRect().height;
                    y(current, newY)
                    current.style.transform = translateY(newY)
                }
            }
        } else if (direction === 'top') {
            // To implement
            for (let i = this.props.pageSize - 1; i >= 0; i--) {
                const [current, next] = [
                    this.pool[i],
                    this.pool[i + 1]
                ]
                const newY = y(next)-MARGIN * 2 - next.getBoundingClientRect().height
                y(current, newY)
                current.style.transform = translateY(newY)
            }
           
        }
        const [start, last] = [this.pool[0], this.pool.at(-1)]
        const topY = y(start)
        const bottomY = y(last) + MARGIN * 2 + last.getBoundingClientRect().height
        top.style.transform = translateY(topY)
        bottom.style.transform = translateY(bottomY)
    }
}