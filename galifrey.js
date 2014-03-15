Math.to_radians = function(degrees) {
    return degrees * Math.PI / 180
}

Math.to_degrees = function(radians) {
    return radians * 180 / Math.PI
}

function circle_intersection(a, r0, b, r1) {
    var x0 = a.x, y0 = a.y,
        x1 = b.x, y1 = b.y
    var dx = x1 -x0, dy = y1 - y0,
        d = Math.sqrt((dx*dx) + (dy*dy))

    if (d > (r0 + r1)) {
        console.log("Circles can not intersect")
        return
    } else if (d < Math.abs(r0 - r1)) {
        console.log("Circle contained in other circle")
    }

    var a = ((r0*r0) - (r1*r1) + (d*d)) / (2.0 * d),
        x2 = x0 + (dx * a/d),
        y2 = y0 + (dy * a/d),
        h = Math.sqrt((r0*r0) - (a*a)),
        rx = -dy * (h/d),
        ry = dx * (h/d)

    return [{x: x2 + rx, y: y2 + ry},
            {x: x2 - rx, y: y2 - ry}]
}

function normalize_angle(a) {
    while (a > (Math.PI*2)) { a -= Math.PI*2 }
    while (a < 0) { a += Math.PI*2 }
    return a
}

function intersection_to_angle(inter, center) {
    var dx1 = center.x - inter[0].x,
        dy1 = center.y - inter[0].y,
        dx2 = center.x - inter[1].x,
        dy2 = center.y - inter[1].y
    var a1 = Math.atan(dy1/dx1), a2 = Math.atan(dy2/dx2)
    if (dx1 >= 0) { a1 -= Math.PI }
    if (dx2 >= 0) { a2 -= Math.PI }
    return {start: normalize_angle(a1),
            end: normalize_angle(a2)}
}

var point = function(spec) {
    var that = {}, spec = spec || {}
    that.x = spec.x || (spec.distance && spec.distance * Math.cos(spec.angle || 0)) || 0
    that.y = spec.y || (spec.distance && spec.distance * Math.sin(spec.angle || 0)) || 0

    that.sqDistanceTo = function(b) {
        var dx = that.x - b.x,
            dy = that.y - b.y

        return dx*dx + dy*dy
    }

    that.distanceTo = function(b) {
        return Math.sqrt(that.sqDistanceTo(b))
    }

    that.equal = function(b) {
        return b.x == that.x && b.y == that.y
    }

    that.toString = function() {
        return 'point({x: ' + that.x + ', y: ' + that.y + '})'
    }

    that.valueOf = that.toString

    return that
}

var shape = function(spec) {
    var that = {}

    that.is = function(type) {
        return (type === 'shape')
    }

    return that
}

var arc = function(spec) {
    var spec = spec || {},
        that = shape(spec),
        _start = spec.start || 0,
        _end = spec.end !== undefined ? spec.end : (Math.PI*2)
    that.radius = spec.radius
    that.start = Math.min(_start, _end)
    that.end = Math.max(_end, _start)
    that.reversed = _start > _end
    that.offset = spec.offset || point({x: 0, y: 0})

    that.overlaps = function(b) {
        return b.start < that.end && b.end > that.start
    }

    that.split = function(from, to) {
        a = Math.min(that.start, from)
        b = Math.max(that.start, from)
        c = to
        d = to < that.end ? that.end : to
        console.log(a, b, c, d)
        a1 = arc({start: a,
                  end: b,
                  radius: that.radius,
                  reversed: that.reversed,
                  offset: that.offset
                 })
        a2 = arc({start: b,
                  end: c,
                  radius: that.radius,
                  reversed: that.reversed,
                  offset: that.offset
                 })
        if (c != d) {
            a3 = arc({start: c,
                      end: d,
                      radius: that.radius,
                      reversed: that.reversed,
                      offset: that.offset
                     })
        }
        return [a1, a2, a3]
    }

    var super_is = that.is
    that.is = function(type) {
        return super_is(type) || (type === 'arc')
    }

    return that
}

var filledArc = function(spec) {
    var that = arc(spec),
        super_is = that.is

    that.is = function(type) {
        return super_is(type) || (type === 'filled')
    }

    return that
}

var circle = function(spec) {
    var that = {},
        internal = {}

    internal.center = point({x: 0, y: 0})
    internal.radius = spec.radius
    internal.base_arc = [arc({radius: spec.radius})]
    internal.shapes = []

    that.getIntersections = function(offset, radius) {
        var offset = point(offset)
        var intersections = circle_intersection(internal.center, internal.radius, offset, radius)
        if (intersections) {
            return [intersection_to_angle(intersections, internal.center),
                    intersection_to_angle(intersections, offset)]
        }
    }

    that.subtract = function(offset, radius) {
        var both_inters = that.getIntersections(offset, radius)
        if (both_inters !== undefined) {
            var a_inters = both_inters[0],
                b_inters = both_inters[1],
                new_base = []

            console.log("Add new sector, between " + a_inters.start + " end " + a_inters.end)
            for (var i = 0 ; i < internal.base_arc.length ; i++) {
                var each = internal.base_arc[i]
                if (each.offset.equal({x: 0, y:0})) {
                    console.log(" - Compare to " + each.start + " and " + each.end)
                    if (each.overlaps(a_inters)) {
                        console.log(" - Split sector between " + each.start + " and " + each.end)
                        var new_arcs = each.split(a_inters.start, a_inters.end),
                            a1 = new_arcs[0],
                            a2 = new_arcs[1],
                            a3 = new_arcs.length == 3 ? new_arcs[2] : undefined
                        new_base.push(a1)
                        internal.shapes.push(arc({start: b_inters.start,
                                                  end: b_inters.end,
                                                  offset: offset,
                                                  radius: radius}))
                        if (a3) {
                            new_base.push(a3)
                        }
                    } else {
                        new_base.push(each)
                    }
                }
            }
            new_base.sort(function(a, b) {
                return a.start - b.start
            })
            internal.base_arc = new_base
        }
        return that
    }

    that.add = function(offset, radius, filled) {
        if (filled) {
            internal.shapes.push(filledArc({offset: offset, radius: radius}))
        } else {
            internal.shapes.push(arc({offset: offset, radius: radius}))
        }
        return that
    }

    that.debug = function() {
        return internal
    }

    that.getShapes = function() {
        // return internal.base_arc
        return internal.base_arc.concat(internal.shapes)
    }

    return that
}

function draw_circle(ctx, offset, c) {
    var shapes = c.getShapes(),
        offset = point(offset),
        x = offset.x,
        y = offset.y
    for (var i = 0 ; i < shapes.length ; i++) {
        var shape = shapes[i]
        if (shape.is('arc') && shape.radius !== undefined) {
            console.log("Draw arc")
            console.log(shape)
            ctx.beginPath()
            ctx.save()
            ctx.strokeStyle = '#faa'
            ctx.arc(x + shape.offset.x, y + shape.offset.y, shape.radius + 10 + (i % 2)*5, shape.start, shape.end, shape.reversed)
            ctx.stroke()
            ctx.restore()
            ctx.beginPath()
            ctx.arc(x + shape.offset.x, y + shape.offset.y, shape.radius, shape.start, shape.end, shape.reversed)
            if (shape.is('filled')) {
                console.log("filled")
                ctx.fill()
                ctx.stroke()
            } else {
                console.log("not filled")
                ctx.stroke()
            }
        }
    }
}

function Word() {
    this.letters = []
    this.center = {x: 250, y: 250}
    this.radius = 100
    this.iteration = 0

    this.draw = function(ctx, count) {
        var x = this.center.x,
            y = this.center.y,
            gaps = []
        this.iteration = count
        for (var i = 0; i < this.letters.length; ++i) {
            gap = this.drawLetter(ctx, this.letters[i])
            if (gap !== undefined) {
                gaps.push(gap)
            }
        }
        gaps.sort(function(a, b) { return b.start - a.start })
        console.log(gaps)
        ctx.beginPath()
        if (gaps.length == 0) {
            ctx.arc(x, y, this.radius, 0, Math.to_radians(360), true)
        } else {
            var current = 0
            for (var j = 0 ; j < gaps.length ; j++) {
                if (current > gaps[j].start && current < gaps[j].end) {
                    current = gaps[j].end
                    continue
                }
                ctx.lineAt(x, y, current, '#f00')
                ctx.lineAt(x, y, gaps[j].start, '#0f0')
                ctx.arc(x, y, this.radius, current, gaps[j].start, true)
                current = gaps[j].end
            }
            if (current < Math.PI*2) {
                ctx.lineAt(x, y, current, '#00f')
                ctx.lineAt(x, y, Math.PI*2, '#00f')
                ctx.arc(x, y, this.radius, current, Math.PI*2)
            }
        }
        // ctx.closePath()
        ctx.stroke()
    }

    this.addLetter = function(letter, angle) {
        this.letters.push({letter: letter,
                           angle: angle})
    }

    this.drawLetter = function(ctx, lobj) {
        var letter = lobj.letter,
            angle = - lobj.angle + 90,
            x = this.center.x,
            y = this.center.y

        var tilt = Math.to_radians(angle),
            tilt_x = Math.cos(tilt),
            tilt_y = Math.sin(tilt)

        switch (letter.toLowerCase()) {
            case 'a':
                ctx.beginPath()
                ctx.arc(x + 115 * tilt_x, y + 115 * tilt_y, 10, 0, Math.to_radians(360), true)
                ctx.closePath()
                ctx.stroke()
                break
            case 'b':
                var radius = 40,
                    // offset = 60.5,
                    offset = 65.5,
                    cx = x + offset * tilt_x,
                    cy = y + offset * tilt_y

                inter = circle_intersection(this.center, this.radius,
                                            {x: cx, y: cy}, radius);
                if (inter !== undefined) {
                    angles = intersection_to_angle(inter, {x: cx, y: cy})
                    outer_gap = intersection_to_angle(inter, this.center)
                    ctx.beginPath()
                    ctx.arc(cx, cy, radius, angles.start, angles.end, false)
                    // ctx.closePath()
                    ctx.stroke()
                    return outer_gap
                }
                break
            default:
                console.log("Unknown character " + letter)
        }
    }
}

function Galifrey() {
    this.initialize = function() {
        self = this
        self.count = 0
        this.canvas = document.getElementById('galifreyCanvas')
        this.canvas.addEventListener('mousewheel', function(event) {
            self.count += event.wheelDelta/100
            self.redraw()
        })
        this.word = new Word()
        this.word.addLetter('a', 0)
        this.word.addLetter('b', 30)
        this.word.addLetter('b', 120)
        this.word.addLetter('c', 60)
        this.word.addLetter('d', 90)
    }

    this.redraw = function() {
        var ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.dot = function(x, y) {
            this.save()
            this.beginPath()
            this.arc(x, y, 5, 0, Math.PI * 2, true)
            this.stroke()
            this.fill()
            this.restore()
        }

        ctx.lineAt = function(x, y, a, c) {
            this.save()
            this.beginPath()
            if (c !== undefined) {
                this.strokeStyle = c
            }
            this.moveTo(x, y)
            this.lineTo(x + 1000 * Math.cos(a), y + 1000 * Math.sin(a))
            this.stroke()
            this.restore()
        }

        var c = circle({radius: 100})
        c.subtract(point({angle: -Math.PI/4, distance: 100}), 40)
        c.subtract(point({angle: 0, distance: 100}), 20)
        // c.subtract(point({angle: -3*Math.PI/4, distance: 120}), 40)
        // c.subtract(point({angle: 3*Math.PI/4, distance: 120}), 40)
        // c.add(point({angle: Math.PI/2, distance: 115}), 10)
        // c.add(point({angle: Math.PI/6, distance: 115}), 10, true)
        draw_circle(ctx, point({x: 250, y: 250}), c)

        // this.word.draw(ctx, this.count)
    }
}

window.onload = function() {
    var canvas = new Galifrey()
    canvas.initialize()
    canvas.redraw()
    // window.onclick = function() {
    //     console.log(canvas)
    //     canvas.redraw()
    // }
}

