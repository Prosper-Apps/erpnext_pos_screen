frappe.pages['pos_screen'].on_page_load = function(wrapper) {
	const pos_screen = new PosScreen(wrapper);

	$(wrapper).bind("show", () => {
		pos_screen.show();
	});

	window.pos_screen = pos_screen;
};

class PosScreen {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Customer POS Screen"),
			single_column: true,
		});

		this.page.main.addClass("frappe-card");
		this.page.body.append('<div class="table-area"></div>');
		this.$content = $(this.page.body).find(".table-area");

		this.make_filters();
		this.refresh_jobs = frappe.utils.throttle(this.refresh_jobs.bind(this), 1000);
	}

	make_filters() {	
		frappe.call({
			method: "pos_screen.pos_screen.page.pos_screen.pos_screen.get_pos_profiles",
			callback: (r) => {
				this.pos_profiles = this.page.add_field({
					label: __("POS Profile"),
					fieldname: "name",
					fieldtype: "Select",
					options: r.message,
					change: () => {
						this.refresh_jobs();
					},
				});
			},
		});	
	}

	show() {
		//this.refresh_jobs();
	}

	refresh_jobs() {
		let pos_profile = this.pos_profiles.get_value();
		let args = {pos_profile}
		this.page.add_inner_message(__("Refreshing..."));
		frappe.call({
			method: "pos_screen.pos_screen.page.pos_screen.pos_screen.get_info",
			args,
			callback: (res) => {
				this.page.add_inner_message("");

				let template = "pos_screen";
				this.$content.html(
					frappe.render_template(template, {
						jobs: res.message || [],
					})
				);

				if (frappe.get_route()[0] === "pos_screen" && pos_profiles) {
					setTimeout(() => this.refresh_jobs(), 2000);
				}
			},
		});
	}
}