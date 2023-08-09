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
		this.get_pos_profiles();	
		this.view = this.page.add_field({
			label: __("View"),
			fieldname: "view",
			fieldtype: "Select",
			options: ["Jobs", "Workers"],
			default: "Jobs",
			change: () => {
				this.queue_timeout.toggle(this.view.get_value() === "Jobs");
				this.job_status.toggle(this.view.get_value() === "Jobs");
			},
		});
		this.queue_timeout = this.page.add_field({
			label: __("Queue"),
			fieldname: "queue_timeout",
			fieldtype: "Select",
			options: [
				{ label: "All Queues", value: "all" },
				{ label: "Default", value: "default" },
				{ label: "Short", value: "short" },
				{ label: "Long", value: "long" },
			],
			default: "all",
		});
		this.job_status = this.page.add_field({
			label: __("Job Status"),
			fieldname: "job_status",
			fieldtype: "Select",
			options: [
				{ label: "All Jobs", value: "all" },
				{ label: "Queued", value: "queued" },
				{ label: "Deferred", value: "deferred" },
				{ label: "Started", value: "started" },
				{ label: "Finished", value: "finished" },
				{ label: "Failed", value: "failed" },
			],
			default: "all",
		});
		this.auto_refresh = this.page.add_field({
			label: __("Auto Refresh"),
			fieldname: "auto_refresh",
			fieldtype: "Check",
			default: 1,
			change: () => {
				if (this.auto_refresh.get_value()) {
					this.refresh_jobs();
				}
			},
		});
	}

	show() {
		this.refresh_jobs();
	}

	get_pos_profiles() {
		frappe.call({
			method: "pos_screen.pos_screen.page.pos_screen.pos_screen.get_pos_profiles",
			callback: (r) => {
				let { status } = r.message;
				if (status === "active") {
					this.page.set_indicator(__("Scheduler: Active"), "green");
				} else {
					this.page.set_indicator(__("Scheduler: Inactive"), "red");
				}
			},
		});
	}

	refresh_jobs() {
		let view = this.view.get_value();
		let args;
		let { queue_timeout, job_status } = this.page.get_form_values();
		if (view === "Jobs") {
			args = { view, queue_timeout, job_status };
		} else {
			args = { view };
		}

		this.page.add_inner_message(__("Refreshing..."));
		frappe.call({
			method: "pos_screen.pos_screen.page.pos_screen.pos_screen.get_info",
			args,
			callback: (res) => {
				this.page.add_inner_message("");

				let template = view === "Jobs" ? "pos_screen" : "background_workers";
				this.$content.html(
					frappe.render_template(template, {
						jobs: res.message || [],
					})
				);

				let auto_refresh = this.auto_refresh.get_value();
				if (frappe.get_route()[0] === "pos_screen" && auto_refresh) {
					setTimeout(() => this.refresh_jobs(), 2000);
				}
			},
		});
	}
}