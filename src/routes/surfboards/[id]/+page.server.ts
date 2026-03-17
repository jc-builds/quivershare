// src/routes/surfboards/[id]/+page.server.ts
import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sendEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      make,
      length,
      width,
      thickness,
      volume,
      fin_system,
      fin_setup,
      style,
      condition,
      price,
      city,
      region,
      notes,
      user_id,
      state,
      is_curated,
      is_deleted,
      source_type,
      source_url,
      owner_type,
      shop_id
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  const currentUserId = locals.user?.id ?? null;
  const ownerType: string = surfboard.owner_type ?? 'individual';

  // Resolve shop details for shop-owned boards
  let shopSlug: string | null = null;
  let shopOwnerUserId: string | null = null;
  let shopInfo: {
    name: string;
    slug: string;
    logo_image_url: string | null;
    website_url: string | null;
    location_label: string | null;
    city: string | null;
    region: string | null;
  } | null = null;
  if (ownerType === 'shop' && surfboard.shop_id) {
    const { data: shop } = await locals.supabase
      .from('shops')
      .select('slug, owner_user_id, name, logo_image_url, website_url, location_label, city, region')
      .eq('id', surfboard.shop_id)
      .maybeSingle();
    if (shop) {
      shopSlug = shop.slug;
      shopOwnerUserId = shop.owner_user_id;
      shopInfo = {
        name: shop.name,
        slug: shop.slug,
        logo_image_url: shop.logo_image_url,
        website_url: shop.website_url,
        location_label: shop.location_label,
        city: shop.city,
        region: shop.region,
      };
    }
  }

  // Resolve admin status (only needed for curated/shop branches)
  let isAdmin = false;
  if (currentUserId && (ownerType === 'curated' || ownerType === 'shop')) {
    const { data: currentUserProfile } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', currentUserId)
      .maybeSingle();
    isAdmin = currentUserProfile?.is_admin === true;
  }

  // Compute canEdit based on owner_type
  let canEdit = false;
  if (currentUserId) {
    if (ownerType === 'individual') {
      canEdit = surfboard.user_id === currentUserId;
    } else if (ownerType === 'shop') {
      canEdit = (shopOwnerUserId === currentUserId) || isAdmin;
    } else if (ownerType === 'curated') {
      canEdit = isAdmin;
    }
  }

  // Compute the correct edit href server-side based on ownership
  let editHref: string | null = null;
  if (canEdit) {
    if (ownerType === 'individual') {
      editHref = `/edit-surfboard/${surfboard.id}`;
    } else if (ownerType === 'shop' && shopSlug) {
      editHref = `/shops/${shopSlug}/dashboard/${surfboard.id}/edit`;
    } else if (ownerType === 'curated') {
      editHref = `/admin/curated-boards/${surfboard.id}`;
    }
  }

  // Fetch owner profile (relevant for individual boards with a user_id)
  let ownerProfile = null;
  if (surfboard.user_id) {
    const { data: profile, error: ownerError } = await locals.supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url, city, region, is_deleted')
      .eq('id', surfboard.user_id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (ownerError) {
      console.warn('Error loading owner profile:', ownerError);
    }
    ownerProfile = profile ?? null;
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id, image_url')
    .eq('surfboard_id', id)
    .order('position', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  const isCurated = ownerType === 'curated' || surfboard.is_curated === true;

  return {
    board: surfboard,
    images: images ?? [],
    owner: ownerProfile,
    canEdit,
    isAdmin,
    isCurated,
    ownerType,
    editHref,
    shopSlug,
    shop: shopInfo
  };
};

export const actions: Actions = {
  updateState: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { context: 'updateState', success: false, message: 'Unauthorized' });
    }

    const id = params.id;
    if (!id) {
      return fail(400, { context: 'updateState', success: false, message: 'Missing board ID' });
    }

    // Verify the board belongs to the user and is not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('user_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (boardError || !board) {
      return fail(404, { context: 'updateState', success: false, message: 'Surfboard not found' });
    }

    if (board.user_id !== user.id) {
      return fail(403, { context: 'updateState', success: false, message: 'Access denied' });
    }

    const form = await request.formData();
    const newState = form.get('state')?.toString();

    if (newState !== 'active' && newState !== 'inactive') {
      return fail(400, { context: 'updateState', success: false, message: 'Invalid state value' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ state: newState })
      .eq('id', id);

    if (updateError) {
      console.error('State update error:', updateError.message);
      return fail(500, { context: 'updateState', success: false, message: 'Failed to update state' });
    }

    return { context: 'updateState', success: true, state: newState };
  },

  contactSeller: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Please sign in to contact the seller.' 
      });
    }

    const id = params.id;
    if (!id) {
      return fail(400, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Missing board ID' 
      });
    }

    // Read and validate form data
    const formData = await request.formData();
    const first_name = (formData.get('first_name') as string | null)?.trim() || '';
    const last_name = (formData.get('last_name') as string | null)?.trim() || '';
    const email = (formData.get('email') as string | null)?.trim() || '';
    const phone = (formData.get('phone') as string | null)?.trim() || '';
    const message = (formData.get('message') as string | null)?.trim() || '';

    // Validate required fields
    if (!first_name) {
      return fail(400, { 
        context: 'contactSeller', 
        success: false, 
        message: 'First name is required.' 
      });
    }

    if (!email) {
      return fail(400, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Email is required.' 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Please enter a valid email address.' 
      });
    }

    if (!message) {
      return fail(400, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Message is required.' 
      });
    }

    // Verify the board exists and is not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id, name, price, user_id, is_curated, owner_type')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (boardError || !board) {
      return fail(404, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Surfboard not found.' 
      });
    }

    // Block contactSeller for curated and shop-owned boards
    if (board.is_curated) {
      return fail(400, {
        context: 'contactSeller',
        success: false,
        message: 'This is a curated listing. Please use the original listing to contact the seller.'
      });
    }

    if (board.owner_type === 'shop') {
      return fail(400, {
        context: 'contactSeller',
        success: false,
        message: 'This board is sold by a shop. Please contact the shop directly.'
      });
    }

    // Fetch the seller profile
    const { data: sellerProfile, error: sellerError } = await locals.supabase
      .from('profiles')
      .select('id, email, username, full_name, is_deleted')
      .eq('id', board.user_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (sellerError || !sellerProfile || !sellerProfile.email) {
      console.error('Error fetching seller profile:', sellerError);
      return fail(500, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Unable to contact the seller at this time.' 
      });
    }

    const sellerEmail = sellerProfile.email;

    // Construct email content
    const boardName = board.name || 'Untitled Board';
    const priceText = board.price != null 
      ? `$${Math.round(board.price).toLocaleString('en-US')}`
      : 'price not specified';
    
    const subject = `QuiverShare inquiry: ${boardName}`;
    
    const sellerName = sellerProfile.full_name || sellerProfile.username;
    const buyerName = last_name ? `${first_name} ${last_name}` : first_name;
    const phoneText = phone ? `\nPhone: ${phone}` : '';
    
    const body = `Hello ${sellerName},

${buyerName} is interested in your board on QuiverShare.

Board: ${boardName}
Price: ${priceText}

Message from ${buyerName}:
${message}

Contact Information:
Email: ${email}${phoneText}

---
This message was sent via QuiverShare.`;

    // Send the email
    try {
      await sendEmail(sellerEmail, subject, body);
      
      return { 
        context: 'contactSeller', 
        success: true, 
        message: 'Your message has been sent.' 
      };
    } catch (err) {
      console.error('Error sending email:', err);
      return fail(500, { 
        context: 'contactSeller', 
        success: false, 
        message: 'Failed to send your message. Please try again later.' 
      });
    }
  }
};
