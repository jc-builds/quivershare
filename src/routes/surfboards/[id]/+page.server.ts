// src/routes/surfboards/[id]/+page.server.ts
import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sendEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the board (public access - anyone can view, but exclude deleted)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the owner's profile (exclude deleted)
  // Note: email is fetched separately in actions, not exposed to client
  const { data: ownerProfile, error: ownerError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, city, region, is_deleted')
    .eq('id', surfboard.user_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (ownerError) {
    console.warn('Error loading owner profile:', ownerError);
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id, image_url')
    .eq('surfboard_id', id)
    .order('id', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  // Determine if the current user can edit this board
  const currentUserId = locals.user?.id ?? null;
  const canEdit = Boolean(currentUserId && surfboard.user_id === currentUserId);

  // Check if current user is admin and board is curated
  let isAdmin = false;
  const isCurated = surfboard.is_curated === true && surfboard.is_deleted === false;
  
  if (currentUserId && isCurated) {
    // Fetch the current user's profile to check is_admin
    const { data: currentUserProfile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', currentUserId)
      .maybeSingle();
    
    if (!profileError && currentUserProfile && currentUserProfile.is_admin === true) {
      isAdmin = true;
    }
  }

  // Get up to 5 images (thumbnail + up to 4 additional)
  const allImages = [
    ...(surfboard.thumbnail_url ? [{ id: 'thumb', image_url: surfboard.thumbnail_url }] : []),
    ...(images ?? [])
  ].filter((img, index, self) => 
    index === self.findIndex((i) => i.image_url === img.image_url)
  ).slice(0, 5);

  return {
    board: surfboard,
    images: allImages,
    owner: ownerProfile ?? null,
    canEdit,
    isAdmin,
    isCurated
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
      .select('id, name, price, user_id, is_curated')
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

    // Block contactSeller action for curated boards
    if (board.is_curated) {
      return fail(400, {
        context: 'contactSeller',
        success: false,
        message: 'This is a curated listing. Please use the original listing to contact the seller.'
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
      ? `$${board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
