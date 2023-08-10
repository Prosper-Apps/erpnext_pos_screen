from . import __version__ as app_version

app_name = "pos_screen"
app_title = "Pos Screen"
app_publisher = "KAINOTOMO PH LTD"
app_description = "Show to customer the current POS sales invoice"
app_email = "info@kainotomo.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/pos_screen/css/pos_screen.css"
# app_include_js = "/assets/pos_screen/js/pos_screen.js"

# include js, css files in header of web template
# web_include_css = "/assets/pos_screen/css/pos_screen.css"
# web_include_js = "/assets/pos_screen/js/pos_screen.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "pos_screen/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
page_js = {
    "pos" : "public/js/extend-point-of-sale.js",
	"point-of-sale" : "public/js/extend-point-of-sale.js"
}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#	"methods": "pos_screen.utils.jinja_methods",
#	"filters": "pos_screen.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "pos_screen.install.before_install"
# after_install = "pos_screen.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "pos_screen.uninstall.before_uninstall"
# after_uninstall = "pos_screen.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "pos_screen.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
#	"*": {
#		"on_update": "method",
#		"on_cancel": "method",
#		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
#	"all": [
#		"pos_screen.tasks.all"
#	],
#	"daily": [
#		"pos_screen.tasks.daily"
#	],
#	"hourly": [
#		"pos_screen.tasks.hourly"
#	],
#	"weekly": [
#		"pos_screen.tasks.weekly"
#	],
#	"monthly": [
#		"pos_screen.tasks.monthly"
#	],
# }

# Testing
# -------

# before_tests = "pos_screen.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "pos_screen.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "pos_screen.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["pos_screen.utils.before_request"]
# after_request = ["pos_screen.utils.after_request"]

# Job Events
# ----------
# before_job = ["pos_screen.utils.before_job"]
# after_job = ["pos_screen.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
#	{
#		"doctype": "{doctype_1}",
#		"filter_by": "{filter_by}",
#		"redact_fields": ["{field_1}", "{field_2}"],
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_2}",
#		"filter_by": "{filter_by}",
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_3}",
#		"strict": False,
#	},
#	{
#		"doctype": "{doctype_4}"
#	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#	"pos_screen.auth.validate"
# ]
