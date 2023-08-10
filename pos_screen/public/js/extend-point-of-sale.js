frappe.provide('erpnext.PointOfSale');
frappe.require('point-of-sale.bundle.js', function () {

    erpnext.PointOfSale.ItemSelector = class KainotomoItemSelector extends erpnext.PointOfSale.ItemSelector {
        constructor(wrapper) {
            super(wrapper);
        }

        make_search_bar() {
            super.make_search_bar();
            return;

            const me = this;
            const doc = me.events.get_frm().doc;
            this.$component.find('.item-group-field').html('');
    
            this.item_group_field = frappe.ui.form.make_control({
                df: {
                    label: __('Item Group'),
                    fieldtype: 'Select',
                    default: "All Item Groups",
                    options: [
                        {name: "All Item Groups", value: "All Item Groups"}, 
                        {name: "Products", value: "Products", class: "class_name"}, 
                        {name: "Raw Material", value: "Raw Material"}
                    ],
                    onchange: function() {
                        me.item_group = this.value;
                        !me.item_group && (me.item_group = me.parent_item_group);
                        me.filter_items();
                    },
                    placeholder: __('Select item group'),							
                },
                parent: this.$component.find('.item-group-field'),
                render_input: true,
            });
            
            this.item_group_field.toggle_label(false);
    
            this.attach_clear_btn();
        }

    };


    wrapper.pos = new erpnext.PointOfSale.Controller(wrapper);
    window.cur_pos = wrapper.pos;
});