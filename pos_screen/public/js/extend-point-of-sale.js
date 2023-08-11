frappe.provide('erpnext.PointOfSale');
frappe.require('point-of-sale.bundle.js', function () {

    erpnext.PointOfSale.ItemSelector = class KainotomoItemSelector extends erpnext.PointOfSale.ItemSelector {
        constructor(wrapper) {
            super(wrapper);
        }

        make_search_bar() {
            super.make_search_bar();

            const me = this;
            const doc = me.events.get_frm().doc;
            this.$component.find('.item-group-field').html('');
            
            this.item_group_field = frappe.ui.form.make_control({
                df: {
                    label: __('Item Group'),
                    fieldtype: 'Select',
                    default: "All Item Groups",
                    options: [],
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

            const selectField = this.item_group_field;
            frappe.call({
                method: 'frappe.desk.search.search_link',
                args: {
                    doctype: 'Item Group',
                    txt: '',
                    reference_doctype: '',
                    query: 'erpnext.selling.page.point_of_sale.point_of_sale.item_group_query',
                    filters: {
                        pos_profile: doc ? doc.pos_profile : ''
                    }
                },
                callback: function (response) {
                    if (response) {
                        selectField.df.options = '';

                        for (let i = 0; i < response.results.length; i++) {
                            selectField.df.options += response.results[i].value + (i !== response.results.length - 1 ? '\n' : '');
                        }

                        console.log(selectField.df.options);

                        selectField.refresh();                    
                    }
                },
            });
        }

    };


    wrapper.pos = new erpnext.PointOfSale.Controller(wrapper);
    window.cur_pos = wrapper.pos;
});