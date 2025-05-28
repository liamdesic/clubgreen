<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { CloudUpload } from 'lucide-svelte';

  export let id = `file-upload-${Math.random().toString(36).substr(2, 9)}`;
  export let label = 'Upload File';
  export let folder = 'uploads'; // e.g. logos, ads, qr-codes
  export let initialUrl = ''; // Add this line to accept initial URL
  export let ariaDescribedBy = '';

  const dispatch = createEventDispatcher();

  let file = null;
  let status = '';
  let size = 0;
  let url = initialUrl || '';

  async function handleFileUpload(event) {
    file = event.target.files[0];
    if (!file) return;

    size = (file.size / 1024).toFixed(1);
    status = 'uploading';

    try {
      // Sanitize filename: replace spaces with underscores and remove special characters
      const sanitizedFilename = file.name
        .replace(/[^\w\d.]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      
      const filename = `${Date.now()}-${sanitizedFilename}`;
      const filePath = `${folder}/${filename}`;
      
      console.log('Uploading file to:', filePath);
      
      // Define the bucket name
      const bucketName = 'public-assets';
      
      // First, check if the bucket exists by listing buckets
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      // Only try to create the bucket if it doesn't exist
      if (!bucketExists) {
        const { error: createError } = await supabase.storage
          .createBucket(bucketName, { public: true })
          .catch(() => ({}));
          
        if (createError && !createError.message.includes('already exists')) {
          console.warn('Error creating bucket:', createError);
        }
      }
      
      // Upload the file to the specified folder in the bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
          duplex: 'half' // Required for some environments
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        // If the error is about the bucket not existing, try to create it
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please create a public bucket named "public-assets" in your Supabase storage.');
        }
        throw new Error(uploadError.message);
      }

      // Get public URL - construct it manually to ensure it's correct
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      const urlData = { publicUrl };

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      url = urlData.publicUrl;
      status = 'uploaded';
      console.log('File uploaded successfully:', url);
      dispatch('upload', { url });
    } catch (err) {
      status = 'error';
      console.error('Upload error:', err);
      showToast('Failed to upload file. Please try again.', 'error');
    }
  }

  function reset() {
    file = null;
    url = initialUrl || '';
    status = '';
    size = 0;
    dispatch('upload', { url: '' });
  }
</script>

<div class="upload-section">
  <label>{label}</label>

  {#if !url && status !== 'uploading'}
    <div class="upload-empty">
      <CloudUpload size="32" color="#888" />
      <p>Drag file here or</p>
      <label for={id} class="upload-browse">
        {label}
      </label>
      <input
        id={id}
        type="file"
        class="upload-input"
        on:change={handleFileUpload}
        aria-describedby={ariaDescribedBy}
      />
      <small>Only .jpg, .png, .svg · Max 5MB</small>
    </div>
  {:else if status === 'uploading'}
    <div class="upload-row">
      <div class="file-info">
        <div class="file-name">Uploading...</div>
        <div class="upload-progress">
          <div class="bar" style="width: 40%"></div>
        </div>
        <small>Uploading file...</small>
      </div>
      <button class="upload-remove" on:click={reset}>✖</button>
    </div>
  {:else}
    <div class="upload-row">
      <img class="thumb" src={url} alt="Preview" />
      <div class="file-info">
        <div class="file-name">
          {#if file}
            {file.name} ({size} KB)
          {:else}
            Current logo
          {/if}
        </div>
        <small>{file ? 'Uploaded' : 'Current'}</small>
      </div>
      <button class="upload-remove" on:click={reset} title="Remove">✖</button>
    </div>
  {/if}
</div>

<style>
  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .upload-empty {
    border: 2px dashed #ccc;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    position: relative;
    background: #fdfdfd;
  }

  .upload-browse {
    margin-top: 0.5rem;
    padding: 0.4rem 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    background: #eee;
    border-radius: 6px;
    cursor: pointer;
  }

  .upload-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    z-index: 2;
    cursor: pointer;
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f8f8f8;
    padding: 1rem;
    border-radius: 10px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
  }

  .thumb {
    height: 50px;
    width: 50px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #ccc;
  }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .upload-progress {
    height: 6px;
    background: #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  .upload-progress .bar {
    height: 100%;
    background: var(--color-accent-purple);
    transition: width 0.3s ease;
  }

  .upload-remove {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #888;
    transition: color 0.2s;
  }

  .upload-remove:hover {
    color: #e53935;
  }
</style>
