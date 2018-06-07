import * as d3 from 'd3'
import { drawAxis, scaleRadial } from 'charts/Functions'

function flatten(array) {
    return Array.prototype.concat(...array)
}

function dendrogram(settings) {

    let chart = {}

    chart.settings = {
        data: null,
        corrs: null,
        names: null,
        ids: null,
        ratio: null,
        selector: null
    }
    for (var setting in settings) {
        chart.settings[setting] = settings[setting]
    }

    chart.data = chart.settings.data
    chart.corrs = chart.settings.corrs
    chart.names = chart.settings.names
    chart.ids = chart.settings.ids

    function toX(d, i) {
        const moduleName = chart.data[i].ordered[-d - 1]
        const projectId = chart.ids[i]
        return chart.x(`${projectId}_${moduleName}`)
    }

    function buildPositions(z) {
        const data = chart.data[z]

        const positions = data.merge.reduce((prev, cur, i) => {
            const x1 = cur[0] < 0 ? toX(cur[0], z) : prev[cur[0]-1]
            const x2 = cur[1] < 0 ? toX(cur[1], z) : prev[cur[1]-1]
            prev.push(x1 + ((x2 - x1) / 2))
            return prev
        }, [])

        return data.merge.map((d, i) => {
            // Element:
            //                    top
            //      left        -------------- right
            //      bottomleft  |            | 
            //                               | bottomright
            let left = d[0] < 0 ? toX(d[0], z) : positions[d[0]-1],
                top = chart.y(data.height[i]),
                right = d[1] < 0 ? toX(d[1], z) : positions[d[1]-1],
                bottomLeft = d[0] < 0 ? chart.y.range()[0] :
                                    chart.y(data.height[d[0]-1]),
                bottomRight = d[1] < 0 ? chart.y.range()[0] :
                                    chart.y(data.height[d[1]-1])

            // console.log({left, top, right, bottomLeft, bottomRight})
            return {left, top, right, bottomLeft, bottomRight}
        })
    }

    !function init() {
        chart.height = 100
        chart.width = 100
        chart.margin = {top: 5, right: 5, bottom: 5, left: 5}
        chart.innerRadius = 275
        chart.outerRadius = 400

        chart.svg = d3.select(chart.settings.selector)
            .attr('transform', `translate(${chart.margin.left}, ${chart.margin.top})`)
        chart.g = chart.svg.append('g')

        // x: projectid_modulename -> node position
        chart.allModules = flatten(chart.data.map((d, i) => {
            const projectId = chart.ids[i]
            return d.ordered
                .map(d2 => `${projectId}_${d2}`)
                .concat(`${projectId}_dummy`)
        }))
        chart.x = d3.scalePoint()
            .domain(chart.allModules)
            .range([0, 2 * Math.PI])
            .padding(.5)

        // y: dendrogram height -> radius
        const heights = flatten(chart.data.map(d => d.height))
        const heightMin = d3.min(heights)
        const heightMax = d3.max(heights)
        chart.y = d3.scaleLinear()
            // .domain([Math.max(heightMin - .1 * (heightMax - heightMin), 0), heightMax])
            .domain([heightMin, heightMax])
            .range([chart.innerRadius, chart.outerRadius])
        
        // 
        chart.color = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(['#C51D1D', 'white', 'steelblue'])

        // Axis
        chart.axis = chart.g.append('g')
            .attr('text-anchor', 'end')
  
        resize()
        updateScales()
    }()

    function resize() {
        chart.width_ = Math.round($(chart.settings.selector).parent().width())
        chart.width = chart.width_ - chart.margin.left - chart.margin.right
        chart.height_ = Math.round(chart.settings.ratio * chart.width_)
        chart.height = chart.height_ - chart.margin.top - chart.margin.bottom
        chart.outerRadius = Math.min(chart.width, chart.height) * .45

        chart.svg.attr('width', chart.width_).attr('height', chart.height_)
        chart.g.attr('transform', `translate(${chart.width / 2}, ${chart.height / 2})`)
    }

    function updateScales() {
    }

    chart.update = function() {
        const line = d3.lineRadial()
        const arc = d3.arc()

        // Trees
        const locations = flatten(chart.data.map((d, z) => buildPositions(z)))
        const group = chart.g.append('g').selectAll('.group').data(locations)
        group.exit().remove()
        const groupEnter = group.enter().append('g')
            .attr('stroke', 'black')
            .attr('stroke-width', '1.5')
        groupEnter.append('path')
            .attr('d', d => line([[d.left, d.top], [d.left, d.bottomLeft]]))
        groupEnter.append('path')
            .attr('d', d => line([[d.right, d.top], [d.right, d.bottomRight]]))
        groupEnter.append('path')
            .attr('d', d => arc({innerRadius: d.top, outerRadius: d.top, startAngle: d.left, endAngle: d.right}))

        // Nodes
        const circle = chart.g.append('g').selectAll('circle.module')
            .data(chart.allModules, d => d)
        circle.exit().remove()
        circle.enter().append('circle')
            .filter(d => d.split('_')[1] !== 'dummy')
            .classed('module', true)
            .attr('transform', d => {
                const radius = chart.innerRadius - 15
                const angle = chart.x(d)
                const x_ = radius * Math.cos(angle - Math.PI * .5) + 1
                const y_ = radius * Math.sin(angle - Math.PI * .5) + 1
                return `translate(${x_}, ${y_})`
            })
            .attr('r', 2)
        
        // Links
        const ribbon = d3.ribbon().radius(chart.innerRadius - 20)
        const link = chart.g.append('g').selectAll('d').data(chart.corrs)
        link.exit().remove()
        link.enter().append('path')
            .attr('stroke', d => chart.color(d.value))
            .attr('opacity', d => Math.log(Math.abs(d.value)) + 1)
            .attr('d', d => {
                const sourceAngle = chart.x(d.source)
                const targetAngle = chart.x(d.target)
                return ribbon({
                    source: { startAngle: sourceAngle, endAngle: sourceAngle },
                    target: { startAngle: targetAngle, endAngle: targetAngle }
                })
            })
        
        // Axis
        const yTick = chart.axis
            .selectAll('g')
            // .data(chart.y.ticks(5).slice(1))
            .data(chart.y.ticks(5))
            .enter().append('g')
    
        yTick.append('circle')
            .attr('fill', 'none')
            .attr('stroke', '#000')
            .attr('stroke-opacity', 0.175)
            .attr('r', chart.y)

        yTick.append('text')
            .attr('x', -6)
            .attr('y', d => -chart.y(d))
            .attr('dy', '0.35em')
            .attr('fill', 'none')
            .attr('stroke', '#fff')
            .attr('stroke-width', 5)
            .text(chart.y.tickFormat(10, 's'));
      
        yTick.append('text')
            .attr('x', -6)
            .attr('y', d => -chart.y(d))
            .attr('dy', '0.35em')
            .text(chart.y.tickFormat(10, 's'));
      
        chart.axis.append('text')
            .attr('x', -6)
            .attr('y', d => -chart.y(chart.y.ticks(10).pop()))
            .attr('dy', '-1em')
            .text('Height')
        
        chart.axis.append('path')
            .attr('stroke', 'grey')
            .attr('stroke-width', 1)
            .attr('d', line([[0, chart.y.range()[0]], [0, chart.y.range()[1]]]))

        return chart
    }

    return chart
}

export default dendrogram