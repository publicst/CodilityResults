var AjaxEditor = (function() {
    var name = '';
    var elem_id = '';
    var editor_id = '';
    var post_url = '';
    var elem = null;
    var editor = null;
    var input = null;

    function AjaxEditor(name, elem_id, editor_id, post_url) {
        this.name = name;
        this.elem_id = elem_id;
        this.editor_id = editor_id;
        this.post_url = post_url;
        this.elem = $(elem_id);
        this.editor = $(editor_id);

        var self = this;

        $(editor_id+' a.cancel').click(function() { return self.cancel(); });
        $(elem_id+' a.change').click(function() { return self.change(); });
        $(editor_id+' .submit').click(function() { return self.submit(); });
    }

    AjaxEditor.prototype.cancel = function() {
        this.editor.hide();
        this.elem.show();
        return false;
    };

    AjaxEditor.prototype.change = function() {
        this.elem.hide();
        this.editor.show();
        return false;
    };

    AjaxEditor.prototype.get_value = function() {
        return this.editor.find('[name="value"]').val();
    };

    AjaxEditor.prototype.submit = function() {
        var self = this;
        var data = this.editor.find('form').serialize();

        var org_submit_val = $(this.editor_id+' .submit').val();
        $(this.editor_id+' .submit').val("submitting...");
        var args = { type:"POST", url: this.post_url, data: data, async:true };
        $.ajax(args).done(function(data) {
            if (data=='OK')
                self.submit_ok();
            else
                self.submit_err(data);
        }).fail(function(data) {
            self.submit_err('Server error!');
        }).always(function() {
            $(self.editor_id+' .submit').val(org_submit_val);
        });

        return false;
    };

    AjaxEditor.prototype.submit_ok = function() {
        $(this.elem_id+' span.value').html($('<div/>').text(this.get_value()).html());
        this.editor.hide();
        this.elem.show();
    };

    AjaxEditor.prototype.submit_err = function(msg) {
        window.alert(msg);
    };

    return AjaxEditor;
})();

// code used in user_info.html
function setupGenericEditor(elem_id, editor_id, callback) {
    var elem = $(elem_id);
    var editor = $(editor_id);

    $(editor_id+' a.cancel').click(function() {
        $(editor_id).hide();
        $(elem_id).show();
        return false;
    });

    $(elem_id+' a.change').click(function() {
        $(elem_id).hide();
        $(editor_id).show();
        return false;
    });

    $(editor_id+' .submit').click(function() {
        var i = $(editor_id+' input[name="value"]');
        if (i.length===0) i = $(editor_id+' textarea[name="value"]');
        var v = $(i).val();
        $(elem_id+' span.value').html($('<div/>').text(v).html());
        callback(v);

        $(editor_id).hide();
        $(elem_id).show();
    });
}

function setupAjaxEditor(name, elem_id, editor_id, post_url) {
    return new AjaxEditor(name, elem_id, editor_id, post_url);
}
