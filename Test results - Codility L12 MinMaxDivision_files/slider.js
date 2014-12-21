/* Solution slider code */

/* TODO maybe delete solutions after the last 'final' one? */

/* global addHelp */
/* global initHighlight */
/* global initBugfixingHighlight */

function initSliders(slider_data, onSubmitChanged) {
    for (var key in slider_data.tasks) {
        var task = slider_data.tasks[key];
        taskSlider(key.toString(), task.solutions, task.task_changes,
                   slider_data.focus_inactive,
                   slider_data.start_time, slider_data.end_time, slider_data.start_label, slider_data.end_label,
                   onSubmitChanged);
    }
}

function taskSlider(task, solutions, task_changes, focus_inactive, start_time, end_time,
    start_label, end_label, onSubmitChanged)
{
    var SLIDER_SIZE = 600; /* number of steps used */
    var MIN_INTERVAL = 5 * 60; /* if the candidate abandoned task for less than 5 minutes, we assume he didn't at all*/
    function min(a,b) {return a < b ? a : b; }
    function max(a,b) {return a > b ? a : b; }
    var tMin = min(task_changes[0].timestamp, start_time);
    var tMax = max(
        task_changes[task_changes.length-1].timestamp,
        end_time
    );
    var dt = tMax - tMin;
    function time_to_percent(time) {
        if (time < tMin) // events from last reopen-attempt
            return 0;
        /* Keeping things away from the edges seems to spare us some trouble */
        return ((time - tMin) / dt) * 0.98 + 0.01;
    }
    function time_to_pos(time) {
        return Math.round(time_to_percent(time)*SLIDER_SIZE);
    }

    function prepareSliderData(solutions, sliderSize)
    {
      /* We skip all non-submit solutions (i.e. auto-saves) closer than
         'granularity' seconds to submits. */

        var granularity = 2;

        var lastSubmit = null;
        var i;
        for (i = 0; i < solutions.length; i++) {
            if (solutions[i].mode !== '')
                lastSubmit = solutions[i];
            if (lastSubmit)
                solutions[i].prevSubmit = lastSubmit;
        }
        lastSubmit = null;
        for (i = solutions.length-1; i >= 0; i--) {
            if (solutions[i].mode !== '')
                lastSubmit = solutions[i];
            if (lastSubmit)
                solutions[i].nextSubmit = lastSubmit;
        }

        var sliderData = [];
        for (i = 0; i < solutions.length; i++) {
            var sol = solutions[i];
            if (sol.mode === '') {
                if (sol.prevSubmit &&
                    sol.timestamp - sol.prevSubmit.timestamp <= granularity)
                    continue;
                if (sol.nextSubmit &&
                     sol.nextSubmit.timestamp - sol.timestamp <= granularity)
                    continue;
            }
            sol.idx = i;
            sliderData.push(sol);
        }

        return sliderData;
    }

    var sliderData = prepareSliderData(solutions, SLIDER_SIZE);
    var current = null;
    var slider = $('#solution-slider-'+task);

    /* --- Changing the submit in the interface --- */

    function changeSubmit(i) {
        if (i == current)
            return;

        var id = 'task-'+task+'-submit-current';
        var placeholder = $('#solution-placeholder-'+task);

        if (current !== null) {
            var oldSubmit = $('#'+id);
            oldSubmit.hide();
        }

        placeholder.empty();

        var newSubmit = $('#task-'+task+'-submit-'+sliderData[i].idx).clone();
        newSubmit.attr('id', id);
        placeholder.append(newSubmit);
        newSubmit.position(placeholder.position);

        //dynamically highlight
        var code = newSubmit.find('.solution-sourcecode-print pre code').get(0);
        if (code){
            initHighlight(code);
        }
        else{
            //bug fixing reports use a different markup
            code = newSubmit.find('.diff-container .diff-file tbody');
            var language = newSubmit.find('.diff-container').attr('data-prg-lang');
            initBugfixingHighlight(code, language);
        }

        addHelp('#'+id +' .help-analysis', '#tip-analysis');

        newSubmit.show();

        $('#extender-'+task).css('height', newSubmit.css('height'));

        if (onSubmitChanged) {
            onSubmitChanged(task, sliderData[i].idx);
        }

        current = i;
    }

    function jumpTo(i) {
        changeSubmit(i);
   //     slider.slider('value', 0);
        slider.slider('value', time_to_pos(sliderData[i].timestamp));
    }

    function changePos(pos) {
        var i = 0;
        while (i < sliderData.length-1 && time_to_pos(sliderData[i+1].timestamp) <= pos)
            i++;

        changeSubmit(i);
    }

    /* --- Slider set-up --- */

    var sliderOptions = {
        min: 0,
        max: SLIDER_SIZE,
        slide: function() {
            changePos(slider.slider('value'));
        },
        /* apparently 'slide' doesn't catch the final change after
           releasing the slider
           */
        stop: function() {
            changePos(slider.slider('value'));
        }
    };

    slider.slider(sliderOptions);

    var i;
    var initial = sliderData.length-1;
    /* Start from the last 'final' submit */
    for (i = 0; i < sliderData.length; i++)
        if (sliderData[i].mode == 'final')
            initial = i;
    jumpTo(initial);

    /* --- next/prev/play/stop buttons --- */

    function nextSubmit() {
        for (var i = current+1; i < sliderData.length && sliderData[i].mode === ''; i++)
            ;
        if (i >= sliderData.length)
            i--;
        jumpTo(i);
    }

    function prevSubmit() {
        var i;
        for (i = current-1; i >= 0 && sliderData[i].mode === ''; i--)
            ;
        if (i < 0)
            i = 0;
        jumpTo(i);
    }
    $('#timeline-'+task+'-next').button({icons:{primary:'ui-icon-seek-next'}, text: false}).click(nextSubmit);
    $('#timeline-'+task+'-prev').button({icons:{primary:'ui-icon-seek-prev'}, text: false}).click(prevSubmit);

    $('#timeline-'+task+'-rewind').button({icons:{primary:'ui-icon-seek-first'}, text: false})
      .click(function() { jumpTo(0); });
    $('#timeline-'+task+'-forward').button({icons:{primary:'ui-icon-seek-end'}, text: false})
      .click(function() { jumpTo(sliderData.length-1); });

    var timer = null;

    function stop() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    function play() {
        if (timer !== null) {
            return;
        }

        if (current == sliderData.length-1)
            jumpTo(0, false);

        var maxPos = slider.slider('option','max');

        function step() {
            var v = slider.slider('value');
            v = Math.min(maxPos, v+5);
            slider.slider('value', v);
            changePos(v);
            if (current == sliderData.length-1)
                stop();
        }
        timer = setInterval(step, 90);
    }

    $('#timeline-'+task+'-play').button({icons:{primary:'ui-icon-play'}, text: false}).click(play);
    $('#timeline-'+task+'-stop').button({icons:{primary:'ui-icon-stop'}, text: false}).click(stop);

    /* --- Submit marks on the slider --- */

    var timeline = $('<div id="task-' + task + '-timeline" class="task-timeline"></div>');
    timeline.appendTo($('#solution-timeline-container-' + task));

    function mark(clsprefix, stime, etime) {
        var bar = $('<div class="'+clsprefix+'bar"></div>');
        bar.appendTo(timeline);
        bar.css('left',  time_to_percent(stime) * timeline.width());
        bar.css('width', (time_to_percent(etime) - time_to_percent(stime))* timeline.width() );
        bar.attr('note','' + stime + ':' + etime);

    }
    function mark_work_done(stime, etime) {
        mark("work", stime, etime);
    }
    function mark_inactive(stime, etime) {
        mark("inactive", stime, etime);
    }

    var opened = false;
    var work = [];
    var stime;
    for(i=0; i < task_changes.length; i++) {
        if (!task_changes[i].to_current && opened) {
            /* if the break was shorter than MIN_INTERVAL, we ignore it */
            for(var j=i+1; j<task_changes.length && task_changes[j].timestamp - task_changes[i].timestamp < MIN_INTERVAL; j++)
                if (task_changes[j].to_current) continue;
            work.push([stime, task_changes[i].timestamp]);
            opened = false;
        }
        if (task_changes[i].to_current && !opened) {
            opened = true;
            stime = task_changes[i].timestamp;
        }
    }
    if (opened) work.push([stime, tMax]);
    work.sort();

    var events = [];
    $.each(work, function(i,el) {
        events.push([el[0], 'work_start']);
        events.push([el[1], 'work_end']);
    });
    $.each(focus_inactive, function(i,el) {
        events.push([el.start_time, 'inactive_start']);
        events.push([el.end_time, 'inactive_end']);
    });
    events.sort();
    var is_active = true, is_work = false;
    var last_t = null;
    $.each(events, function(i,e) {
        var t = e[0];
        if (last_t !== null && is_work && last_t < t) {
            if (is_active) mark_work_done(last_t, t);
            else mark_inactive(last_t, t);
        }
        last_t = t;
        if (e[1]=='work_start') is_work = true;
        else if (e[1]=='work_end') is_work = false;
        else if (e[1]=='inactive_start') is_active = false;
        else if (e[1]=='inactive_end') is_active = true;
    });

    slider.css('border','0');
    timeline.css('top', 4);

    var jump_to_event = function(event) {
        jumpTo(event.data);
    };

    for (i = 0; i < sliderData.length; i++) {
        if (sliderData[i].mode === '')
            continue;
        var mode = sliderData[i].mode;
        var mclass='verify';
        if (mode=='final' || mode=='verify' || mode=='paste')
            mclass=mode;
        var outer = $('<div class="submit-outer outer-'+mclass+'"></div>');
        var inner = $('<div class="submit-inner inner-' + mclass + '"></div>').appendTo(outer);
        timeline.append(outer);
        outer.attr('note','' + sliderData[i].timestamp);
        outer.css('left',
           time_to_percent(sliderData[i].timestamp) * timeline.width());
        inner.click(i, jump_to_event);
    }

    /* --- Start and end times --- */

    $('#solution-slider-'+task+'-time-start')
      .text(start_label);
    $('#solution-slider-'+task+'-time-end')
      .text(end_label);

}
