<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { CloudUpload } from 'lucide-svelte';
  import '$lib/styles/theme.css';

  export let id = `file-upload-${Math.random().toString(36).substr(2, 9)}`;
  export let label = 'Upload File';
  export let folder = 'uploads'; // e.g. logos, ads, qr-codes
  export let initialUrl = ''; // Add this line to accept initial URL
  export let ariaDescribedBy = '';
  export let theme: 'light' | 'dark' = 'light';

  const dispatch = createEventDispatcher<{
    uploaded: { url: string };
  }>();
  
  // Initialize Supabase client
  const supabase = createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );

  let file: File | null = null;
  let status = '';
  let size = 0;
  let url = initialUrl || '';

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    file = target.files?.[0] || null;
    if (!file) return;

    size = Number((file.size / 1024).toFixed(1));
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
      const bucketExists = buckets?.some((bucket: { name: string }) => bucket.name === bucketName);
      
      // Skip bucket creation - assume bucket exists or will be created by admin
      // Bucket creation typically requires elevated permissions
      
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
      dispatch('uploaded', { url });
    } catch (err) {
      status = 'error';
      console.error('Upload error:', err);
      // Just log the error instead of using showToast
      console.error('Failed to upload file. Please try again.');
    }
  }

  function reset() {
    file = null;
    url = ''; // Always clear URL completely, don't use initialUrl
    status = '';
    size = 0;
    dispatch('uploaded', { url: '' });
  }
</script>

<div class="upload-section" data-theme={theme}>

  {#if !url && status !== 'uploading'}
    <div class="upload-empty">
      <CloudUpload size="32" color={theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#888'} />
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
            {file.name}
          {:else}
            {label.replace('Upload', '')}
          {/if}
        </div>
        <div class="file-details">
          {#if file}
            <span class="file-size">{size} KB</span>
            <span class="file-type">{file.type.split('/')[1].toUpperCase()}</span>
            <span class="file-date">{new Date(file.lastModified).toLocaleDateString()}</span>
          {/if}
        </div>
        <small>{file ? 'Uploaded' : ''}</small>
      </div>
      <button class="upload-remove" on:click={reset} title="Remove">✖</button>
    </div>
  {/if}
</div>

<style>
  .upload-section {
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .upload-section[data-theme="dark"] {
    --upload-bg: rgba(0, 0, 0, 0.2);
    --upload-border: rgba(255, 255, 255, 0.2);
    --upload-text: rgba(255, 255, 255, 0.9);
    --upload-text-secondary: rgba(255, 255, 255, 0.7);
    --upload-hover: rgba(255, 255, 255, 0.1);
    --upload-shadow: rgba(0, 0, 0, 0.2);
  }

  .upload-section[data-theme="light"] {
    --upload-bg: #fdfdfd;
    --upload-border: #ccc;
    --upload-text: #333;
    --upload-text-secondary: #666;
    --upload-hover: #eee;
    --upload-shadow: rgba(0, 0, 0, 0.05);
  }

  .upload-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--upload-border);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    position: relative;
    background: var(--upload-bg);
    color: var(--upload-text);
    transition: border-color 0.2s ease, background-color 0.2s ease;
    outline: 2px solid transparent;
    outline-offset: 2px;
  }

  .upload-empty p {
    color: white;
  }

  .upload-empty small {
    margin-top: 10px;
  }

  .upload-empty:hover {
    border-color: var(--upload-text-secondary);
    background: var(--upload-hover);
  }

  .upload-empty:focus-within {
    outline-color: var(--upload-text-secondary);
  }

  .upload-browse {
    margin-top: 0.5rem;
    padding: 0.4rem 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    background: var(--upload-border);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    color: var(--upload-text);
    transition: background-color 0.2s ease;
  }

  .upload-browse:hover {
    background: var(--upload-hover);
    opacity: 0.9;
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
    background: var(--upload-bg);
    padding: 1rem;
    border-radius: 10px;
    box-shadow: inset 0 1px 2px var(--upload-shadow);
    color: var(--upload-text);
    border: 1px solid var(--upload-border);
  }

  .thumb {
    height: 50px;
    width: 50px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid var(--upload-border);
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
    color: var(--upload-text);
  }

  .file-details {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--upload-text-secondary);
  }

  .file-size, .file-type, .file-date {
    display: inline-flex;
    align-items: center;
  }

  .upload-progress {
    height: 6px;
    background: var(--upload-border);
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
    color: var(--upload-text-secondary);
    transition: color 0.2s;
  }

  .upload-remove:hover {
    color: #e53935;
  }

  small {
    color: var(--upload-text-secondary);
    font-size: 0.8rem;
  }
</style>
