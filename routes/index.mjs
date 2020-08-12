// import handler from"../handler/index.mjs"
import config from "../config/config.mjs"

export default function router(app, model) {
	/** Router for add-book */
	app.post(`/${config.BASE}/${config.BOOK_ITEM}`, async(req, res, next) => {
		const argsMap = { nameValues: req.body };
		await addBookHandler(model, argsMap);
	});
	
	/** Router for find-book command */
	app.get(`/${config.BASE}/${config.BOOKS_COLLECTION}`, async(req, res, next) => {
		const argsMap = { nameValues: req.query };
		const result = await findBooksHandler(model, argsMap);
		/** Set links property per book item */
		if(result.status && result.status == 'invalid') {
			var status = config.BAD_REQUEST;
			var errors = result.data;
			res.json({ status, errors });
		}
		result.
			map( book_item => 
				book_item.links = {
					href: `${req.baseUrl}/${config.BOOK_ITEM}/${book_item.isbn}`,
					rel: 'details',
					name: 'book'
				}
			)
		
		const self_href = `${req.selfUrl}`;
		var next_href = `${self_href.split('?')[0]}?`;
		var prev_href = `${self_href.split('?')[0]}?`;

		const _count = req.query._count ? req.query._count : 5;
		var is_index = 0;

		const params = self_href.split('?')[1];
		const param_array = params.split('&');

		param_array.forEach((param) => {
			if( param.split('=')[0] == '_index') {
				next_href = `${next_href}${param.split('=')[0]}=${Number(param.split('=')[1]) + Number(_count)}&`;
				prev_href = `${prev_href}${param.split('=')[0]}=${Number(param.split('=')[1]) - _count}&`;
				is_index++;
			} else {
				next_href = `${next_href}${param}&`;
				prev_href = `${prev_href}${param}&`;
			}
		});

		if(is_index == 0) {
			next_href = `${next_href}_index=${_count}&`;
		}

		next_href = next_href.substring(0, next_href.length -1);
		prev_href = prev_href.substring(0, prev_href.length - 1);

		const links = [
			{ rel:  'self', name: 'self', href: self_href },
			{ rel:  'next', name: 'next', href: next_href },
			{ rel:  'prev', name: 'prev', href: prev_href }
		];
		res.json({ result, links });
	});
	
	/** Router for Book item */
	app.get(`/${config.BASE}/${config.BOOK_ITEM}/:isbn`, async(req, res, next) => {
		const argsMap = { nameValues: req.params };
		const result = await getBookHandler(model, argsMap);
		if(result.status && result.status == 'invalid') {
			var status = '';
			if(result.data[0].code == 'BAD_ID') {
				status = config.NOT_FOUND
			} else {
				status = config.BAD_REQUEST
			}
			var errors = result.data;
			res.status(status).json({ status, errors })
		}

		const self_href = `${req.selfUrl}`;

		const links = [
			{ rel:  'self', name: 'self', href: self_href }
		];
		res.json({result, links });
	});
	
	/* Router for new cart item */
	app.post(`/${config.BASE}/${config.CARTS_COLLECTION}`, async(req, res, next) => {
		const argsMap = { nameValues: req.body };
		const result = await newCartHandler(model, argsMap);		

		if(result.status && result.status == 'invalid') {
			var status = config.BAD_REQUEST;
			var errors = result.data;
			res.status(status).json({ status, errors });
		}
		
		const cart_href = `${req.baseUrl}/${config.CART}/${result}`;
		
		// const links = [
		// 	{ rel: 'cart item', name: 'cart', href: cart_href}
		// ];
		res.location(cart_href)
		res.status(config.CREATED).json()
	});

	/* Router for get cart items */
	app.get(`/${config.BASE}/${config.CART}/:cartId`, async(req, res, next) => {
		const argsMap = { nameValues: req.params };
		const cart = await getCartHandler(model, argsMap);
		const result = await getCartsCollectionHandler(model);
		
		if(cart.status && cart.status == 'invalid') {
			var status = '';
			if(cart.data[0].code == 'BAD_ID') {
				status = config.NOT_FOUND
			} else {
				status = config.BAD_REQUEST
			}
			var errors = cart.data;
			res.status(status).json({ status, errors })
		}
		
		const _lastModified = cart._lastModified;
		const self_href = `${req.selfUrl}`;
		result.
			map( cart_item => 
				cart_item.links = {					
					rel: 'item',
					name: 'book',
					href: `${req.baseUrl}/${config.BOOK_ITEM}/${cart_item.sku}`,
				}
			)		

		const links = [
			{ rel:  'self', name: 'self', href: self_href }
		];

		res.json({ _lastModified, links, result });
	});

	/* Router for updating cart item */
	app.patch(`/${config.BASE}/${config.CART}/:_id`, async(req, res, next) => {
		const argsMap = {nameValues: req.body };
		argsMap.nameValues.cartId = req.params._id;
		const result = await cartItemHandler(model, argsMap);
		
		if(result.status && result.status == 'invalid') {
			var status = '';
			if(result.data[0].code == 'BAD_ID') {
				status = config.NOT_FOUND
			} else {
				status = config.BAD_REQUEST
			}
			var errors = result.data;
			res.status(status).json({ status, errors })
		}
		
		const cart_href = req.selfUrl;
		
		const links = [
			{ rel: 'item', name: 'cart', href: cart_href}
		];
		res.status(config.NO_CONTENT).json({ links})
	});
}

/** handler for add-book */
async function addBookHandler(model, argsMap) {
	const { nameValues} = argsMap;
	return await model.addBook(nameValues)
}

/** handler for find-book command 2*/
async function findBooksHandler(model, argsMap) {
	const {nameValues, names=[]} = argsMap;
	const results = await model.findBooks( nameValues);

	if(results.status && results.status == 'invalid') {
		return results;
	}
	if (names.length === 0) {
	  return results;
	}
	else {
	  return results.
		map(result => Object.fromEntries(names.map(n => [n, result[n]])));
	}
}

/* handler for get-book command 3*/
async function getBookHandler(model, argsMap) {
	const { nameValues } = argsMap;
	const result = await model.getBook(nameValues);
	return result;
}

/** handler for new-cart 4*/
async function newCartHandler(model, argsMap) {
  const { nameValues} = argsMap;
  return await model.newCart(nameValues)
}

/** handler for find-cart 5*/
async function getCartHandler(model, argsMap) {
  const { nameValues} = argsMap;
  return await model.getCart(nameValues)
}

/* handler for find cart items 5*/
async function getCartsCollectionHandler(model) {
	return await model.getCartsCollection()
}

/** handler for cart-item */
async function cartItemHandler(model, argsMap) {
	const { nameValues} = argsMap;
	return await model.cartItem(nameValues)
}