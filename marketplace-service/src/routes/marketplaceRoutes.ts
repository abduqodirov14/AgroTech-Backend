import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as listingCtrl from '../controllers/listingController';
import * as orderCtrl from '../controllers/orderController';
import * as cartCtrl from '../controllers/cartController';
import * as catalogCtrl from '../controllers/catalogController';
import * as favoriteCtrl from '../controllers/favoriteController';
import * as seedCtrl from '../controllers/seedController';

const router = Router();

// ── Static paths first (before /:id) ──────────────────────────

router.get('/overview', listingCtrl.getOverview);
router.post('/seed-demo', seedCtrl.seedDemo);

router.get('/catalog/products', catalogCtrl.getProducts);
router.get('/catalog/services', catalogCtrl.getServices);
router.get('/promotions', catalogCtrl.getPromotions);

// Orders (B2B escrow)
router.post('/orders', requireAuth, orderCtrl.createOrder);
router.get('/orders', requireAuth, orderCtrl.getMyOrders);
router.get('/orders/:id', requireAuth, orderCtrl.getOrder);
router.post('/orders/:id/fund-escrow', requireAuth, orderCtrl.fundEscrow);
router.post('/orders/:id/confirm-delivery', requireAuth, orderCtrl.confirmDelivery);

// Cart
router.get('/cart', requireAuth, cartCtrl.getCart);
router.post('/cart/items', requireAuth, cartCtrl.addItem);
router.patch('/cart/items/:itemId', requireAuth, cartCtrl.updateItem);
router.delete('/cart/items/:itemId', requireAuth, cartCtrl.removeItem);
router.delete('/cart', requireAuth, cartCtrl.clearCart);

// Favorites
router.get('/favorites', requireAuth, favoriteCtrl.getFavorites);
router.post('/favorites/:listingId', requireAuth, favoriteCtrl.addFavorite);
router.delete('/favorites/:listingId', requireAuth, favoriteCtrl.removeFavorite);

// Listings
router.get('/', listingCtrl.listListings);
router.post('/', requireAuth, listingCtrl.createListing);
router.get('/:id/sensor-history', listingCtrl.getSensorHistory);
router.get('/:id', listingCtrl.getListing);
router.patch('/:id', requireAuth, listingCtrl.updateListing);
router.delete('/:id', requireAuth, listingCtrl.cancelListing);

export default router;
