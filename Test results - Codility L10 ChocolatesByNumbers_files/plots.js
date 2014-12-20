/* Define new bar render */
/* Start.BarRender */
var BarRenderer = function() {
    $.jqplot.BarRenderer.call(this);
};

BarRenderer.prototype = new $.jqplot.BarRenderer();
BarRenderer.prototype.constructor = $.jqplot.BarRenderer; // need to set constructor as $.jqplot.BarRenderer because internally they rely on that.

BarRenderer.prototype.init = function(options, plot) {
    // indicator whether the bar's value is infinity
    this.infinity = false;

    $.jqplot.BarRenderer.prototype.init.call(this, options, plot);
};

BarRenderer.prototype.draw = function(ctx, gridData, options, plot) {
    function drawSineWawes(x1, x2, yStart, strokeStyle) {
        function f(x) {
            return Math.sin(0.6 * x);
        }

        var shift = 0.0;

        ctx.beginPath();
        ctx.strokeStyle = strokeStyle;
        ctx.moveTo(x1 - shift, yStart);
        for (var x = x1 - shift; x <= x2 + shift; x += 0.5) {
            var y = yStart + f(x);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.closePath();
    }

    $.jqplot.BarRenderer.prototype.draw.call(this, ctx, gridData, options, plot);

    if (this.infinity) {
        var gapShift = 6;
        var gapHeight = 5;
        var X = this._barPoints[0][0][0],
            Y = this._yaxis.u2p(this._plotData[0][1]) + gapShift;

        ctx.beginPath();
        ctx.fillStyle = '#FFFFFF';
        ctx.rect(X, Y, this.barWidth, gapHeight);
        ctx.fill();
        ctx.closePath();

        drawSineWawes(X, this._barPoints[0][2][0], Y, '#FFFFFF');
        drawSineWawes(X, this._barPoints[0][2][0], Y, '#000000');
        drawSineWawes(X, this._barPoints[0][2][0], Y + gapHeight, '#FFFFFF');
        drawSineWawes(X, this._barPoints[0][2][0], Y + gapHeight, '#000000');
    }
};
/* End. BarRender */

var PlotsUtils = {
    barHighlight: function(plot, sidx, pidx, points) {
        var s = plot.series[sidx];

        var canvas = plot.plugins.barRenderer.highlightCanvas;
        canvas._ctx.clearRect(0,0,canvas._ctx.canvas.width, canvas._ctx.canvas.height);

        s._highlightedPoint = pidx;

        plot.plugins.barRenderer.highlightedSeriesIndex = sidx;

        var opts = {fillStyle: s.highlightColors[0]};

        s.renderer.shapeRenderer.draw(canvas._ctx, points, opts);
        canvas = null;
    },
    barUnhighlight: function(plot) {
        var canvas = plot.plugins.barRenderer.highlightCanvas;
        canvas._ctx.clearRect(0,0, canvas._ctx.canvas.width, canvas._ctx.canvas.height);
        for (var i=0; i<plot.series.length; i++) {
            plot.series[i]._highlightedPoint = null;
        }
        plot.plugins.barRenderer.highlightedSeriesIndex = null;
        plot.target.trigger('jqplotDataUnhighlight');
        canvas =  null;
    },
    maxProperty: function(array, prop) {
        var values = $.map(array, function (element) {
            return element[prop];
        });

        return Math.max.apply(null, values);
    }
};

var POSSIBLE_TEST_RESULTS = {
    TIMEOUT : "TIMEOUT ERROR",
    OK : "OK"
};

var PlotsBuilder = {
    current_plots_per_task: [],
    plots_data: [],
    colors: ['rgba(29, 207, 238, 1)', 'rgba(13, 174, 10, 1)', 'rgba(255, 30, 55, 1)'],

    init: function(solutionsForTasks) {
        for (var task_counter = 0; task_counter < solutionsForTasks.length; task_counter += 1) {
            var plots_data_per_task = {};
            var submits = solutionsForTasks[task_counter].submits;

            for (var submit_counter = 0; submit_counter < submits.length; submit_counter += 1) {
                var plots_data_per_submit = [];
                var labels = [];
                var competitors =  $.parseJSON(submits[submit_counter].competitors_data);
                var candidate_tests_data = $.parseJSON(submits[submit_counter].candidate_tests_data);
                var submit_id = submits[submit_counter].id;
                var i = 0;
                if (labels.length === 0) {
                    labels.push('Candidate');
                    for (i = 0; i < competitors.length; i += 1) {
                        labels.push(competitors[i].label);
                    }
                }

                var max_time = PlotsUtils.maxProperty(candidate_tests_data, 'time');
                for (i = 0; i < competitors.length; i += 1) {
                    max_time = Math.max(max_time, PlotsUtils.maxProperty(competitors[i].data, 'time'));
                }

                for (var j = 0; j < candidate_tests_data.length; j += 1) {
                    var data = [[[0, parseFloat(candidate_tests_data[j].time)]]];
                    var results = [candidate_tests_data[j].result];

                    for (i = 0; i < competitors.length; i += 1) {
                        var value = 0.0;
                        var result = "";

                        for (var k = 0; k < competitors[i].data.length; k += 1) {
                            if (candidate_tests_data[j].name == competitors[i].data[k].name) {
                                value = parseFloat(competitors[i].data[k].time);
                                result = competitors[i].data[k].result;
                                break;
                            }
                        }

                        data.push([[0, value]]);
                        results.push(result);
                    }

                    var target_element = 'plot-' + task_counter + '-' + submit_id + '-' + candidate_tests_data[j].name;

                    if ($('#' + target_element).length > 0) {
                        plots_data_per_submit.push({
                            target_element: target_element,
                            data: data,
                            results: results,
                            max_time: max_time
                        });
                    }
                }

                plots_data_per_task[submit_id] = {
                    data: plots_data_per_submit,
                    labels: labels
                };
            }

            this.plots_data.push(plots_data_per_task);
            this.current_plots_per_task.push([]); // initialize empty array of plots for current task
        }
    },
    buildLegend: function(labels, id) {
        var html = '';
        for (var i = 0; i < labels.length; i += 1) {
            html += '<span class="plot-legend-outline"><span class="plot-legend" data="' + id + '-' + i.toString() + '"" style="border-color:' + this.colors[i] + '"></span></span><span>' + labels[i] +'</span>';
        }

        return html + '<span class="help-icon"></span>';
    },
    highlightSolution: function(task_counter, solution_counter, highlight) {
        var submit_plots = this.current_plots_per_task[task_counter];

        for (var i = 0; i < submit_plots.length; i += 1) {
            if (highlight){
                PlotsUtils.barHighlight(submit_plots[i], solution_counter, solution_counter, submit_plots[i].series[solution_counter]._barPoints[0]);
            }
            else{
                PlotsUtils.barUnhighlight(submit_plots[i]);
            }
        }
    },
    rebuild: function(task, submit) {
        var mouseleaveHandler = function() {
            var id = '#' + $(this).attr('id');
            $(id + ' .jqplot-highlighter-tooltip').each(function() {
                $(this).hide();
            });
        };

        if (!this.plots_data.hasOwnProperty(task) || !this.plots_data[task].hasOwnProperty(submit))
            return;

        var plotsDataToBuild = this.plots_data[task][submit];

        if (plotsDataToBuild && plotsDataToBuild.data.length > 0) {
            var $legend = $('#plot-legend-' + task);
            var html = this.buildLegend(plotsDataToBuild.labels, task);
            $legend.html(html);

            var submit_data = plotsDataToBuild.data;
            var plots = [];
            for (var i = 0; i < submit_data.length; i += 1) {
                plots.push(this.buildPlot(
                    submit_data[i].target_element,
                    submit_data[i].data,
                    submit_data[i].results,
                    submit_data[i].max_time)
                );

                // bug fix. tooltips sometimes stay visible when user don't hover bars any more.
                $('#' + submit_data[i].target_element).mouseleave(mouseleaveHandler);
            }

            this.current_plots_per_task[task] = plots;

            var that = this;
            $('.plot-legend').hover(
                function() {
                    var data = $(this).attr('data').split("-");
                    that.highlightSolution(data[0], data[1], true);
                },
                function() {
                    var data = $(this).attr('data').split("-");
                    that.highlightSolution(data[0], data[1], false);
                }
            );
        }

        $('th .help-icon').qtip({
            content: $('#tip-plots-explanation').html(),
            position: { my: 'bottom right', at: 'top middle' }
        });
    },
    buildPlot: function(element, plot_data, statuses, max_Y) {
        var barWidth = 15;
        var barPadding = 10;
        var barMargin = 0;

        function showInfinity(status) {
            return status == POSSIBLE_TEST_RESULTS.TIMEOUT ? true : false;
        }

        var series = [];
        for (var i = 0; i < plot_data.length; i += 1) {
            series.push({
                color: this.colors[i],
                rendererOptions: {
                    infinity: showInfinity(statuses[i])
                }
            });
        }

        var plot = $.jqplot(
            element,
            plot_data,
            {
                seriesDefaults: {
                    renderer: BarRenderer,
                    rendererOptions: {
                        barMargin: barMargin,
                        barPadding: barPadding,
                        barWidth: barWidth,
                        shadow:false,
                    }
                },
                series: series,
                gridPadding: {top:0, right:0, bottom:0, left:0},
                axesDefaults: {
                    rendererOptions: {
                        drawBaseline: true,
                        baselineColor: '#444444',
                        baselineWidth: 3,
                    },
                    tickOptions: {
                        show: false,
                    }
                },
                axes: {
                    xaxis: {
                        renderer: $.jqplot.CategoryAxisRenderer,
                        rendererOptions: {
                            baselineWidth: 2,
                        },
                    },
                    yaxis: {
                        min: -max_Y/10.0, // to make visible bars with very small values (e.g. 0.001)
                        max: max_Y,
                    },
                },
                grid: {
                    drawGridLines: false,
                    borderWidth: 0,
                    shadow: false,
                    background: 'rgba(0,0,0,0)'
                },
                highlighter: {
                    show: true,
                    showMarker: false,
                    tooltipLocation: 'e',
                    tooltipOffset:-5,
                    tooltipContentEditor: function (str, seriesIndex, pointIndex, plot) {
                        var prefix = showInfinity(statuses[seriesIndex]) ? '> ' : '';
                        return prefix + plot.data[seriesIndex][pointIndex][1].toString() + ' s';
                    }
                },
            }
        );

        return plot;
    }
};
