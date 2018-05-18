
define(['libs/backbone', 'css!styles/widgets/fileBrowser.css'],

function(Backbone, empty) {
	return Backbone.View.extend({
		events: {
			destroyed: 'dispose',
			'click tr[data-filename]': '_fileClicked',
			'click button.close': '_deleteClicked',
			'dblclick tr[data-filename]': '_fileChosen',
			'click a.prev': '_previous',
			'click a.next': '_next'
		},

		className: "fileBrowser",



		initialize: function() {
			this.current_page = 1;
			console.log("afte initialize"+this.current_page);
			this.render = this.render.bind(this);
			this.storageInterface.on("change:currentProvider", this.render);

			this.template = JST['tantaman.web.widgets/FileBrowser'];

			this.renderListing = this.renderListing.bind(this);
			
		},

		render: function() {

			this.$el.html('<div class="browserContent">');

			if (this.storageInterface.providerReady(this.$el)) {
				this.renderListing();
			} else {
				this.storageInterface.activateProvider(this.$el, this.renderListing);
			}
			return this;
		},

		dispose: function() {
			this.storageInterface.off(null, null, this);
		},
		_previous: function() {
			this.current_page = this.current_page - 1;
			this.renderListing()
		},
		_next: function() {
			this.current_page =this.current_page +1;
			this.renderListing()
		},
		_fileClicked: function(e) {
			this.$fileName.val(e.currentTarget.dataset.filename);
			this.$el.find('.active').removeClass('active');
			$(e.currentTarget).addClass('active');
		},
  
		_fileChosen: function(e) {
			this.$el.trigger('fileChosen', e.currentTarget.dataset.fileName);
		},

		_deleteClicked: function(e) {
			var $target = $(e.currentTarget);
			var $li = $target.parent().parent();
			this.storageInterface.remove($li.attr('data-filename'));
			$li.remove();
			e.stopPropagation();
			//this.renderListing();
			return false;
		},

  

		renderListing: function() {
			var self = this;
			this.storageInterface.listPresentations("/", function(list, err) {
				var paginater = function paginate_func(collection, page = 1, numItems = 10) {
					  if( !Array.isArray(collection) ) {
					    throw `Expect array and got ${typeof collection}`;
					  }
					  const currentPage = parseInt(page);
					  const perPage = parseInt(numItems);
					  const offset = (page - 1) * perPage;
					  const paginatedItems = collection.slice(offset, offset + perPage);

					  return {
					  	gtzero:  Math.ceil(collection.length / perPage)>1,
					  	hasprev: currentPage > 1,
					  	hasnext: currentPage < Math.ceil(collection.length / perPage),
					    currentPage,
					    perPage,
					    total: collection.length,
					    totalPages: Math.ceil(collection.length / perPage),
					    data: paginatedItems
					  };
				}
				var paginateCollection = paginater(list,self.current_page,6);
				if (err) {
					self.$el.find('.browserContent').html(err);
				} else {
					self.$el.find('.browserContent').html(self.template({files: paginateCollection}));
					
				}

				self.$fileName = self.$el.find('.fileName');
			});
		},

		fileName: function() {
			return this.$fileName.val();
		},

		constructor: function ProviderTab(storageInterface, editorModel) {
			this.storageInterface = storageInterface;
			this.editorModel = editorModel;
			Backbone.View.prototype.constructor.call(this);
		},

		


	});
});